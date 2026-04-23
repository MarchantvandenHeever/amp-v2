/**
 * AMP score-recalc edge function
 * --------------------------------------------------------------
 * Source of truth (do NOT modify the math here without updating the
 * documents that own it):
 *   - AMP_Behavioural_Adoption_Scoring_Model.pdf  (master)
 *   - Participation_Scoring_Algorithm_Framework.pdf
 *   - Ownership_Scoring_Algorithm_Framework.pdf
 *   - Confidence_Scoring_Algorithm_Framework.pdf
 *
 * Pipeline (per user × initiative):
 *   1. Load admin scoring_config from DB (no hard-coded weights/baselines).
 *   2. Pull behavioural_events from the rolling window.
 *   3. Bucket events by (pillar, trait_key) → v_ij with ageDays.
 *   4. x_i  = Σ(v_ij · d_j) / Σ(d_j),     d_j = e^(−λ·Δt_j)
 *      s_i  = clip((x_i − μ_i)/((1 + CV_i)·σ_i), −1, 1)
 *      P/O/C = Σ w_i · s_i        (clip to [-1,1])
 *      Pillar_100 = 50·(P + 1)
 *   5. Apply time-progress p; compute adoption_dashboard, adoption_ideal,
 *      adoption_gap exactly per the master model.
 *   6. Persist trait_observations (audit), scores (current), score_history
 *      (snapshot), and behavioural_flags (overload + confidence calibration
 *      flags — operational, never deducted from the score).
 *
 * Invocation:
 *   POST /score-recalc            → recalc all users × all active initiatives
 *   POST /score-recalc { user_id, initiative_id }  → single pair
 */

import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

// ─── Math (verbatim from src/lib/scoringEngine.ts) ─────────────

const EPSILON = 0.01;
const clip1 = (z: number) => Math.max(-1, Math.min(1, z));
const decayRate = (h: number) => Math.LN2 / Math.max(h, EPSILON);
const decayWeight = (age: number, lambda: number) =>
  Math.exp(-lambda * Math.max(0, age));

function decayWeightedTrait(
  events: { value: number; ageDays: number }[],
  lambda: number,
): number {
  if (!events.length) return Number.NaN;
  let n = 0, d = 0;
  for (const e of events) {
    const w = decayWeight(e.ageDays, lambda);
    n += e.value * w;
    d += w;
  }
  return d > 0 ? n / d : Number.NaN;
}

function scaleTrait(x: number, mu: number, sigma: number): number {
  const cv = sigma / Math.max(mu, EPSILON);
  const denom = (1 + cv) * sigma;
  if (denom <= 0) return 0;
  return clip1((x - mu) / denom);
}

const pillarScore100 = (raw: number) => 50 * (clip1(raw) + 1);

function timeProgress(now: Date, start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e <= s) return 0;
  return Math.max(0, Math.min(1, (now.getTime() - s) / (e - s)));
}

// ─── Types ─────────────────────────────────────────────────────

type TraitConfig = {
  weight: number;
  label: string;
  baseline_mean: number;
  baseline_sd: number;
};

type PhaseWeights = { participation: number; ownership: number; confidence: number };

type ScoringConfig = {
  phase_weights: Record<string, PhaseWeights>;
  decay_settings: { default_window_days: number; default_half_life_days: number };
  participation_traits: Record<string, TraitConfig>;
  ownership_traits: Record<string, TraitConfig>;
  confidence_traits: Record<string, TraitConfig>;
  adoption_target: { A_target: number; weighting_mode: "baseline" | "phase"; epsilon: number };
  confidence_flags?: {
    overconfidence_threshold: number;
    underconfidence_threshold: number;
    volatility_threshold: number;
  };
};

interface BEvent {
  user_id: string;
  initiative_id: string | null;
  pillar: string;
  event_type: string;
  value: number;
  occurred_at: string;
  payload: Record<string, unknown>;
}

// ─── Helpers ───────────────────────────────────────────────────

async function loadConfig(sb: ReturnType<typeof createClient>): Promise<ScoringConfig> {
  const { data, error } = await sb.from("scoring_config").select("config_key, config_value");
  if (error) throw error;
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.config_key] = row.config_value;
  return {
    phase_weights: (map.phase_weights as ScoringConfig["phase_weights"]) ?? {
      baseline: { participation: 0.20, ownership: 0.40, confidence: 0.40 },
    },
    decay_settings: (map.decay_settings as ScoringConfig["decay_settings"]) ?? {
      default_window_days: 14,
      default_half_life_days: 7,
    },
    participation_traits: (map.participation_traits as ScoringConfig["participation_traits"]) ?? {},
    ownership_traits: (map.ownership_traits as ScoringConfig["ownership_traits"]) ?? {},
    confidence_traits: (map.confidence_traits as ScoringConfig["confidence_traits"]) ?? {},
    adoption_target: (map.adoption_target as ScoringConfig["adoption_target"]) ?? {
      A_target: 85, weighting_mode: "baseline", epsilon: EPSILON,
    },
    confidence_flags: map.confidence_flags as ScoringConfig["confidence_flags"],
  };
}

function bucketEvents(events: BEvent[]): Record<string, Record<string, { value: number; ageDays: number }[]>> {
  // pillar → trait_key → []
  const out: Record<string, Record<string, { value: number; ageDays: number }[]>> = {
    participation: {}, ownership: {}, confidence: {},
  };
  const now = Date.now();
  for (const e of events) {
    const pillar = e.pillar;
    if (!out[pillar]) continue;
    const trait = (e.payload?.trait_key as string) || e.event_type;
    if (!trait) continue;
    const ageDays = Math.max(0, (now - new Date(e.occurred_at).getTime()) / 86_400_000);
    (out[pillar][trait] ??= []).push({ value: Number(e.value) || 0, ageDays });
  }
  return out;
}

function computePillar(
  traitEvents: Record<string, { value: number; ageDays: number }[]>,
  traitConfig: Record<string, TraitConfig>,
  halfLifeDays: number,
  p: number,
) {
  const lambda = decayRate(halfLifeDays);
  const details: {
    trait_key: string; observed: number; scaled: number; weight: number;
    baseline_mean: number; baseline_sd: number; event_count: number; used_baseline_fallback: boolean;
  }[] = [];
  let raw = 0;
  for (const [key, cfg] of Object.entries(traitConfig)) {
    const events = traitEvents[key] ?? [];
    const x_raw = decayWeightedTrait(events, lambda);
    const used_baseline_fallback = !Number.isFinite(x_raw);
    const x_i = used_baseline_fallback ? cfg.baseline_mean : x_raw;
    const s_i = scaleTrait(x_i, cfg.baseline_mean, cfg.baseline_sd);
    raw += cfg.weight * s_i;
    details.push({
      trait_key: key, observed: x_i, scaled: s_i, weight: cfg.weight,
      baseline_mean: cfg.baseline_mean, baseline_sd: cfg.baseline_sd,
      event_count: events.length, used_baseline_fallback,
    });
  }
  raw = clip1(raw);
  const score_100 = pillarScore100(raw);
  const dashboard = score_100 * Math.max(0, Math.min(1, p));
  return { raw, score_100, dashboard, details };
}

function resolveWeights(
  phase: string | undefined,
  mode: "baseline" | "phase",
  weights: Record<string, PhaseWeights>,
) {
  if (mode === "baseline") return { weights: weights.baseline, phase_used: "baseline" };
  const k = phase && weights[phase] ? phase : "training_testing";
  return { weights: weights[k] ?? weights.baseline, phase_used: k };
}

// ─── Recalc one (user, initiative) pair ────────────────────────

async function recalcOne(
  sb: ReturnType<typeof createClient>,
  cfg: ScoringConfig,
  userId: string,
  initiative: { id: string; phase: string; start_date: string | null; end_date: string | null },
) {
  const halfLife = cfg.decay_settings.default_half_life_days;
  const window = cfg.decay_settings.default_window_days;
  const cutoff = new Date(Date.now() - window * 86_400_000).toISOString();

  const { data: events } = await sb
    .from("behavioural_events")
    .select("user_id, initiative_id, pillar, event_type, value, occurred_at, payload")
    .eq("user_id", userId)
    .eq("initiative_id", initiative.id)
    .gte("occurred_at", cutoff);

  const buckets = bucketEvents((events ?? []) as BEvent[]);
  const p = timeProgress(new Date(), initiative.start_date, initiative.end_date);

  const P = computePillar(buckets.participation, cfg.participation_traits, halfLife, p);
  const O = computePillar(buckets.ownership,     cfg.ownership_traits,     halfLife, p);
  const C = computePillar(buckets.confidence,    cfg.confidence_traits,    halfLife, p);

  const { weights, phase_used } = resolveWeights(
    initiative.phase, cfg.adoption_target.weighting_mode, cfg.phase_weights,
  );
  const adoption_score_100 =
    P.score_100 * weights.participation +
    O.score_100 * weights.ownership +
    C.score_100 * weights.confidence;
  const adoption_dashboard = adoption_score_100 * p;
  const adoption_ideal = cfg.adoption_target.A_target * p;
  const eps = cfg.adoption_target.epsilon ?? EPSILON;
  const adoption_gap = clip1(
    (adoption_dashboard - adoption_ideal) / Math.max(adoption_ideal, eps),
  );

  // 1. trait_observations (audit trail; replace per recalc)
  await sb.from("trait_observations")
    .delete()
    .eq("user_id", userId)
    .eq("initiative_id", initiative.id);

  const traitRows = [
    ...P.details.map((d) => ({ pillar: "participation", ...d })),
    ...O.details.map((d) => ({ pillar: "ownership",     ...d })),
    ...C.details.map((d) => ({ pillar: "confidence",    ...d })),
  ].map((d) => ({
    user_id: userId,
    initiative_id: initiative.id,
    pillar: d.pillar,
    trait_key: d.trait_key,
    observed_value: d.observed,
    scaled_value: d.scaled,
    weight: d.weight,
    baseline_mean: d.baseline_mean,
    baseline_sd: d.baseline_sd,
    rolling_window_days: window,
    half_life_days: halfLife,
    event_count: d.event_count,
  }));
  if (traitRows.length) await sb.from("trait_observations").insert(traitRows);

  // 2. scores (current)
  await sb.from("scores")
    .delete()
    .eq("user_id", userId)
    .eq("initiative_id", initiative.id);
  await sb.from("scores").insert({
    user_id: userId,
    initiative_id: initiative.id,
    participation: P.score_100,
    ownership:     O.score_100,
    confidence:    C.score_100,
    adoption:      adoption_score_100,
    participation_dashboard: P.dashboard,
    ownership_dashboard:     O.dashboard,
    confidence_dashboard:    C.dashboard,
    adoption_dashboard,
    adoption_score_100,
    adoption_ideal,
    adoption_gap,
    time_progress: p,
    half_life_days: halfLife,
    rolling_window_days: window,
    phase_used,
  });

  // 3. score_history snapshot
  await sb.from("score_history").insert({
    user_id: userId,
    initiative_id: initiative.id,
    participation: P.score_100,
    ownership:     O.score_100,
    confidence:    C.score_100,
    adoption:      adoption_score_100,
    adoption_dashboard,
    adoption_ideal,
    time_progress: p,
    week_label: new Date().toISOString().slice(0, 10),
  });

  // 3b. Persist live persona on profile (Power/Standard/Reluctant)
  // ΔA = adoption_dashboard − adoption_ideal (percentage-points, both p-scaled)
  // Role-based personas (Admin/Change Manager/Manager) are preserved.
  const deltaA = adoption_dashboard - adoption_ideal;
  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isPerformanceRole = !prof?.role || prof.role === "end_user";
  if (isPerformanceRole) {
    const livePersona =
      deltaA >= 5  ? "Power User" :
      deltaA < -5  ? "Reluctant User" :
                     "Standard User";
    await sb.from("profiles").update({ persona: livePersona }).eq("id", userId);
  }

  // 4. behavioural_flags (operational only — separate from scores)
  // Ownership overload (Ownership §9): H_journey + H_BAU > weekly_limit
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const { data: cap } = await sb
    .from("user_capacity")
    .select("h_journey, h_bau, weekly_limit")
    .eq("user_id", userId)
    .gte("week_start", weekStart.toISOString().slice(0, 10))
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cap) {
    const limit = Number(cap.weekly_limit ?? 40);
    const overloaded = Number(cap.h_journey ?? 0) + Number(cap.h_bau ?? 0) > limit;
    await sb.from("behavioural_flags")
      .delete()
      .eq("user_id", userId)
      .eq("initiative_id", initiative.id)
      .eq("flag_type", "ownership_overload");
    if (overloaded) {
      await sb.from("behavioural_flags").insert({
        user_id: userId, initiative_id: initiative.id,
        pillar: "ownership", flag_type: "ownership_overload", severity: "warning",
        details: { h_journey: cap.h_journey, h_bau: cap.h_bau, weekly_limit: limit },
      });
    }
  }

  // Confidence calibration flags (Confidence §10) — separate from score
  const flagsCfg = cfg.confidence_flags;
  if (flagsCfg) {
    const selfRated = C.details.find((d) => d.trait_key === "C_x1")?.scaled ?? 0;
    const performance =
      ((C.details.find((d) => d.trait_key === "C_x5")?.scaled ?? 0) +
       (O.details.find((d) => d.trait_key === "O_x1")?.scaled ?? 0)) / 2;
    const stability = C.details.find((d) => d.trait_key === "C_x4")?.scaled ?? 0;
    const gap = selfRated - performance;
    const want = (kind: string, raised: boolean, sev: string, det: Record<string, unknown>) => ({
      kind, raised, sev, det,
    });
    const flags = [
      want("overconfidence",  gap >  flagsCfg.overconfidence_threshold,  "warning", { calibration_gap: gap }),
      want("underconfidence", gap <  flagsCfg.underconfidence_threshold, "info",    { calibration_gap: gap }),
      want("confidence_volatility", stability < -flagsCfg.volatility_threshold, "info", { stability }),
    ];
    for (const f of flags) {
      await sb.from("behavioural_flags")
        .delete()
        .eq("user_id", userId)
        .eq("initiative_id", initiative.id)
        .eq("flag_type", f.kind);
      if (f.raised) {
        await sb.from("behavioural_flags").insert({
          user_id: userId, initiative_id: initiative.id,
          pillar: "confidence", flag_type: f.kind, severity: f.sev, details: f.det,
        });
      }
    }
  }

  return { user_id: userId, initiative_id: initiative.id, p, P: P.score_100, O: O.score_100, C: C.score_100, adoption_score_100, adoption_dashboard, adoption_ideal, adoption_gap, phase_used };
}

// ─── HTTP handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUser = (body.user_id as string | undefined) ?? null;
    const targetInit = (body.initiative_id as string | undefined) ?? null;

    const cfg = await loadConfig(sb);

    // Initiative set
    let initQ = sb.from("initiatives")
      .select("id, phase, start_date, end_date, status")
      .eq("status", "active");
    if (targetInit) initQ = sb.from("initiatives").select("id, phase, start_date, end_date, status").eq("id", targetInit);
    const { data: initiatives, error: initErr } = await initQ;
    if (initErr) throw initErr;

    // User set (end_user role)
    let userQ = sb.from("profiles").select("id").eq("role", "end_user");
    if (targetUser) userQ = sb.from("profiles").select("id").eq("id", targetUser);
    const { data: users, error: userErr } = await userQ;
    if (userErr) throw userErr;

    const results: unknown[] = [];
    for (const init of initiatives ?? []) {
      for (const u of users ?? []) {
        results.push(await recalcOne(sb, cfg, u.id, init));
      }
    }

    return new Response(
      JSON.stringify({
        ok: true, recalced: results.length,
        config_source: "scoring_config table (admin-managed)",
        sample: results.slice(0, 3),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[score-recalc] error", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
