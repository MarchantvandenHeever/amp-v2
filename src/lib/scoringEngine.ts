/**
 * AMP Behavioural Adoption Scoring Engine
 *
 * SINGLE SOURCE OF TRUTH:
 *   - AMP_Behavioural_Adoption_Scoring_Model.pdf  (master)
 *   - Participation_Scoring_Algorithm_Framework.pdf
 *   - Ownership_Scoring_Algorithm_Framework.pdf
 *   - Confidence_Scoring_Algorithm_Framework.pdf
 *
 * Formulas implemented verbatim:
 *
 *   d_j  = e^(-λ Δt_j)                                       (decay)
 *   x_i  = Σ(v_ij · d_j) / Σ(d_j)                             (decay-weighted trait)
 *   CV_i = σ_i / max(μ_i, ε)
 *   s_i  = clip( (x_i − μ_i) / ((1 + CV_i)·σ_i),  −1, 1 )
 *
 *   P    = Σ w_i s_i      (raw Participation, [-1,1])
 *   O    = Σ w_i s_i      (raw Ownership,    [-1,1])
 *   C    = Σ w_i s_i      (raw Confidence,   [-1,1])
 *
 *   PillarScore_100 = 50 · (RawScore + 1)                     ([0,100])
 *
 *   p              = max(0, min(1, (t − t_start)/(t_end − t_start)))
 *   Pillar_dash    = PillarScore_100 · p
 *
 *   AdoptionScore_100 = P_100·w_P + O_100·w_O + C_100·w_C
 *   A_dashboard       = AdoptionScore_100 · p
 *   A_ideal           = A_target · p
 *   ΔA                = clip((A_dashboard − A_ideal)/max(A_ideal, ε), −1, 1)
 *
 * Baseline weighting (AMP §9.1):     P=0.20  O=0.40  C=0.40
 * Phase weighting (AMP §9.3):
 *   design_build:     P=0.35  O=0.35  C=0.30
 *   training_testing: P=0.20  O=0.40  C=0.40
 *   post_go_live:     P=0.10  O=0.45  C=0.45
 */

// ─── Constants ──────────────────────────────────────────────────

export const EPSILON = 0.01;

// ─── Types ──────────────────────────────────────────────────────

export interface TraitConfig {
  weight: number;
  label: string;
  baseline_mean: number;   // μ_i
  baseline_sd: number;     // σ_i
  formula?: string;        // documentation only
}

export interface PhaseWeights {
  participation: number;
  ownership: number;
  confidence: number;
}

export interface DecaySettings {
  default_window_days: number;
  default_half_life_days: number;
  epsilon: number;
  baseline_refresh_weeks: number;
  presets: Record<string, { half_life: number; label: string }>;
}

export interface ScoringConfig {
  phase_weights: Record<string, PhaseWeights>;
  decay_settings: DecaySettings;
  participation_traits: Record<string, TraitConfig>;
  ownership_traits: Record<string, TraitConfig>;
  confidence_traits: Record<string, TraitConfig>;
  adoption_target: { A_target: number; weighting_mode: 'baseline' | 'phase'; epsilon: number };
  participation_safeguards?: Record<string, unknown>;
  confidence_flags?: { overconfidence_threshold: number; underconfidence_threshold: number; volatility_threshold: number };
}

export interface BehaviouralEvent {
  /** raw event contribution v_ij — already mapped to the trait's [0,1] scale */
  value: number;
  /** age in days from the calculation date */
  ageDays: number;
}

export interface TraitDetail {
  trait_key: string;
  label: string;
  observed: number;     // x_i
  scaled: number;       // s_i
  weight: number;       // w_i
  baseline_mean: number;
  baseline_sd: number;
  cv: number;
  event_count: number;
  used_baseline_fallback: boolean;
}

export interface PillarResult {
  raw: number;          // [-1,1]
  score_100: number;    // [0,100]
  dashboard: number;    // score_100 × p
  trait_details: TraitDetail[];
}

// ─── Default config (verbatim from the four documents) ──────────

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  // AMP §9.1 baseline + AMP §9.3 phase
  phase_weights: {
    baseline:         { participation: 0.20, ownership: 0.40, confidence: 0.40 },
    design_build:     { participation: 0.35, ownership: 0.35, confidence: 0.30 },
    training_testing: { participation: 0.20, ownership: 0.40, confidence: 0.40 },
    post_go_live:     { participation: 0.10, ownership: 0.45, confidence: 0.45 },
  },

  decay_settings: {
    default_window_days: 14,
    default_half_life_days: 7,
    epsilon: EPSILON,
    baseline_refresh_weeks: 10,
    presets: {
      '7':  { half_life: 4,  label: 'Fast — go-live readiness' },
      '14': { half_life: 7,  label: 'Default — moderate' },
      '30': { half_life: 14, label: 'Slower — long formation windows' },
    },
  },

  // Participation §6 + §8
  participation_traits: {
    P_x1:  { weight: 0.16, label: 'Content access',           baseline_mean: 0.85, baseline_sd: 0.10, formula: 'N_accessed / N_assigned' },
    P_x2:  { weight: 0.12, label: 'Engagement timeliness',    baseline_mean: 0.70, baseline_sd: 0.15, formula: '1 − min(1, avg_hours_to_first_access / threshold)' },
    P_x3:  { weight: 0.12, label: 'Content dwell quality',    baseline_mean: 0.65, baseline_sd: 0.15, formula: '0.4·dwell_ratio + 0.3·scroll_completion + 0.3·video_completion' },
    P_x4:  { weight: 0.16, label: 'Completion coverage',      baseline_mean: 0.80, baseline_sd: 0.12, formula: 'N_completed / N_required' },
    P_x5:  { weight: 0.10, label: 'Engagement consistency',   baseline_mean: 0.65, baseline_sd: 0.15, formula: 'D_active / D_eligible' },
    P_x6:  { weight: 0.08, label: 'Breadth of engagement',    baseline_mean: 0.60, baseline_sd: 0.15, formula: 'T_engaged / T_assigned' },
    P_x7:  { weight: 0.07, label: 'Revisit behaviour',        baseline_mean: 0.35, baseline_sd: 0.15, formula: 'min(1, N_revisited / N_accessed)' },
    P_x8:  { weight: 0.07, label: 'Nudge responsiveness',     baseline_mean: 0.55, baseline_sd: 0.20, formula: 'N_completed_after_nudge / N_nudges_sent' },
    P_x9:  { weight: 0.06, label: 'Active engagement depth',  baseline_mean: 0.50, baseline_sd: 0.20, formula: 'normalised interaction depth index' },
    P_x10: { weight: 0.06, label: 'Participation continuity', baseline_mean: 0.65, baseline_sd: 0.15, formula: '1 − min(1, largest_inactivity_gap / threshold)' },
  },

  // Ownership §6 + §8
  ownership_traits: {
    O_x1:  { weight: 0.16, label: 'Task completion quality',     baseline_mean: 0.75, baseline_sd: 0.10, formula: 'Σ q_k / N_q' },
    O_x2:  { weight: 0.14, label: 'Timeliness of execution',     baseline_mean: 0.70, baseline_sd: 0.15, formula: 'N_ontime / N_assigned' },
    O_x3:  { weight: 0.14, label: 'Evidence of application',     baseline_mean: 0.60, baseline_sd: 0.20, formula: 'Σ e_k / N_e' },
    O_x4:  { weight: 0.08, label: 'Improvement over time',       baseline_mean: 0.10, baseline_sd: 0.10, formula: 'normalised slope of attempt scores' },
    O_x5:  { weight: 0.08, label: 'Voluntary engagement',        baseline_mean: 0.25, baseline_sd: 0.15, formula: 'N_optional_done / max(N_optional_available,1)' },
    O_x6:  { weight: 0.14, label: 'Independence from reminders', baseline_mean: 0.70, baseline_sd: 0.15, formula: '1 − N_reminder_completed / max(N_completed,1)' },
    O_x7:  { weight: 0.10, label: 'Behavioural consistency',     baseline_mean: 0.65, baseline_sd: 0.15, formula: 'max(0, 1 − σ_c / max(μ_c, ε))' },
    O_x8:  { weight: 0.06, label: 'Problem resolution',          baseline_mean: 0.60, baseline_sd: 0.20, formula: 'N_corrected_failures / max(N_failures,1)' },
    O_x9:  { weight: 0.04, label: 'Volunteer as change agent',   baseline_mean: 0.10, baseline_sd: 0.10, formula: 'N_change_agent_acts / opportunities' },
    O_x10: { weight: 0.03, label: 'Teamwork',                    baseline_mean: 0.55, baseline_sd: 0.20, formula: 'team contribution score' },
    O_x11: { weight: 0.03, label: 'Voluntary insights',          baseline_mean: 0.15, baseline_sd: 0.10, formula: 'N_insights / opportunities' },
  },

  // Confidence §6 + §8
  confidence_traits: {
    C_x1:  { weight: 0.10, label: 'Self-rated readiness',           baseline_mean: 0.70, baseline_sd: 0.15, formula: 'self_rated / max_rating' },
    C_x2:  { weight: 0.18, label: 'Calibration accuracy',           baseline_mean: 0.65, baseline_sd: 0.15, formula: '1 − |confidence − performance|' },
    C_x3:  { weight: 0.08, label: 'Response decisiveness',          baseline_mean: 0.60, baseline_sd: 0.20, formula: '1 − min(1, response_time / target_response_time)' },
    C_x4:  { weight: 0.12, label: 'Confidence stability',           baseline_mean: 0.65, baseline_sd: 0.15, formula: '1 − normStdDev(confidence over time)' },
    C_x5:  { weight: 0.18, label: 'Scenario performance confidence',baseline_mean: 0.60, baseline_sd: 0.20, formula: 'scenario_confidence × scenario_performance' },
    C_x6:  { weight: 0.08, label: 'Recovery after mistakes',        baseline_mean: 0.55, baseline_sd: 0.20, formula: 'successful_recoveries / recovery_opportunities' },
    C_x7:  { weight: 0.10, label: 'Help dependency (inverse)',      baseline_mean: 0.65, baseline_sd: 0.15, formula: '1 − help_requests / task_attempts' },
    C_x8:  { weight: 0.08, label: 'Confidence growth',              baseline_mean: 0.10, baseline_sd: 0.10, formula: '(latest − initial) / max_rating' },
    C_x9:  { weight: 0.04, label: 'Advanced task participation',    baseline_mean: 0.20, baseline_sd: 0.15, formula: 'advanced_attempted / advanced_offered' },
    C_x10: { weight: 0.04, label: 'Training volunteering',          baseline_mean: 0.10, baseline_sd: 0.10, formula: 'volunteer_instances / training_opportunities' },
  },

  adoption_target: { A_target: 85, weighting_mode: 'baseline', epsilon: EPSILON },

  confidence_flags: {
    overconfidence_threshold: 0.30,
    underconfidence_threshold: -0.30,
    volatility_threshold: 0.25,
  },
};

// ─── Core mathematics ───────────────────────────────────────────

/** λ = ln(2) / half-life */
export function decayRate(halfLifeDays: number): number {
  return Math.LN2 / Math.max(halfLifeDays, EPSILON);
}

/** d_j = e^(−λ Δt_j) */
export function decayWeight(ageDays: number, lambda: number): number {
  return Math.exp(-lambda * Math.max(0, ageDays));
}

/**
 * x_i = Σ(v_ij · d_j) / Σ(d_j)
 * Returns NaN when there are no events — caller decides whether to fall back
 * to the baseline mean (which gives s_i = 0 → exactly 50/100, the model's
 * defined "at expected baseline" point).
 */
export function decayWeightedTrait(events: BehaviouralEvent[], lambda: number): number {
  if (!events.length) return Number.NaN;
  let num = 0;
  let den = 0;
  for (const e of events) {
    const d = decayWeight(e.ageDays, lambda);
    num += e.value * d;
    den += d;
  }
  return den > 0 ? num / den : Number.NaN;
}

/** clip(z, -1, 1) */
const clip1 = (z: number): number => Math.max(-1, Math.min(1, z));

/**
 * s_i = clip( (x_i − μ_i) / ((1 + CV_i) · σ_i),  −1, 1 )
 * with CV_i = σ_i / max(μ_i, ε)
 */
export function scaleTrait(x_i: number, mu: number, sigma: number): number {
  const cv = sigma / Math.max(mu, EPSILON);
  const denom = (1 + cv) * sigma;
  if (denom <= 0) return 0;
  return clip1((x_i - mu) / denom);
}

/** PillarScore_100 = 50 · (raw + 1) */
export function pillarScore100(raw: number): number {
  return 50 * (clip1(raw) + 1);
}

/** p = max(0, min(1, (t − t_start)/(t_end − t_start))) */
export function timeProgress(now: Date, start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

// ─── Pillar calculation ─────────────────────────────────────────

/**
 * Compute a single pillar end-to-end.
 *
 * @param traitEvents map of trait_key → events that contribute v_ij
 *                    (events are already mapped to the [0,1] formula output)
 * @param traitConfig per-trait weight + baseline
 * @param halfLifeDays decay half-life from admin config
 * @param p time-progress in [0,1]
 *
 * For traits with no events the model says: x_i is undefined. We fall back
 * to μ_i, which by construction gives s_i = 0 — explicitly the
 * "baseline / expected behaviour" point in the documented [-1,1] scale.
 * That fallback is flagged in trait_details so the drill-down can show it.
 */
export function computePillar(
  traitEvents: Record<string, BehaviouralEvent[]>,
  traitConfig: Record<string, TraitConfig>,
  halfLifeDays: number,
  p: number,
): PillarResult {
  const lambda = decayRate(halfLifeDays);
  const trait_details: TraitDetail[] = [];
  let raw = 0;

  for (const [key, cfg] of Object.entries(traitConfig)) {
    const events = traitEvents[key] ?? [];
    const x_raw = decayWeightedTrait(events, lambda);
    const used_baseline_fallback = !Number.isFinite(x_raw);
    const x_i = used_baseline_fallback ? cfg.baseline_mean : x_raw;
    const s_i = scaleTrait(x_i, cfg.baseline_mean, cfg.baseline_sd);

    raw += cfg.weight * s_i;

    trait_details.push({
      trait_key: key,
      label: cfg.label,
      observed: x_i,
      scaled: s_i,
      weight: cfg.weight,
      baseline_mean: cfg.baseline_mean,
      baseline_sd: cfg.baseline_sd,
      cv: cfg.baseline_sd / Math.max(cfg.baseline_mean, EPSILON),
      event_count: events.length,
      used_baseline_fallback,
    });
  }

  raw = clip1(raw);
  const score_100 = pillarScore100(raw);
  const dashboard = score_100 * Math.max(0, Math.min(1, p));

  return { raw, score_100, dashboard, trait_details };
}

// ─── Adoption ───────────────────────────────────────────────────

export interface AdoptionResult {
  adoption_score_100: number; // weighted sum on [0,100]
  adoption_dashboard: number; // adoption_score_100 × p
  adoption_ideal: number;     // A_target × p
  adoption_gap: number;       // ΔA in [-1, 1]
  weights_used: PhaseWeights;
  weighting_mode: 'baseline' | 'phase';
  phase_used: string;
  time_progress: number;
}

/**
 * Resolve the active set of pillar weights.
 *
 * weighting_mode = 'baseline' → AMP §9.1 fixed (20/40/40)
 * weighting_mode = 'phase'    → AMP §9.3 per-phase
 */
export function resolveWeights(
  phase: string | undefined,
  weighting_mode: 'baseline' | 'phase',
  phaseWeights: Record<string, PhaseWeights>,
): { weights: PhaseWeights; phase: string } {
  if (weighting_mode === 'baseline') {
    return { weights: phaseWeights.baseline, phase: 'baseline' };
  }
  const key = phase && phaseWeights[phase] ? phase : 'training_testing';
  return { weights: phaseWeights[key] ?? phaseWeights.baseline, phase: key };
}

/**
 * Compute the full adoption layer for a single user-initiative pair.
 *
 * AdoptionScore_100 = P_100·w_P + O_100·w_O + C_100·w_C   (AMP §9.2)
 * A_dashboard       = AdoptionScore_100 × p               (AMP §9.4)
 * A_ideal           = A_target × p                        (AMP §9.5)
 * ΔA                = clip((A_dashboard − A_ideal)/max(A_ideal, ε), −1, 1)
 *                                                          (AMP §9.6)
 */
export function computeAdoption(
  participation_score_100: number,
  ownership_score_100: number,
  confidence_score_100: number,
  p: number,
  config: ScoringConfig,
  phase?: string,
): AdoptionResult {
  const { weights, phase: phase_used } = resolveWeights(
    phase,
    config.adoption_target.weighting_mode,
    config.phase_weights,
  );

  const adoption_score_100 =
    participation_score_100 * weights.participation +
    ownership_score_100     * weights.ownership +
    confidence_score_100    * weights.confidence;

  const tp = Math.max(0, Math.min(1, p));
  const adoption_dashboard = adoption_score_100 * tp;
  const adoption_ideal = config.adoption_target.A_target * tp;

  const eps = config.adoption_target.epsilon ?? EPSILON;
  const adoption_gap = clip1(
    (adoption_dashboard - adoption_ideal) / Math.max(adoption_ideal, eps),
  );

  return {
    adoption_score_100,
    adoption_dashboard,
    adoption_ideal,
    adoption_gap,
    weights_used: weights,
    weighting_mode: config.adoption_target.weighting_mode,
    phase_used,
    time_progress: tp,
  };
}

// ─── Behavioural flags (separate from scores) ───────────────────

export interface OverloadFlag {
  raised: boolean;
  h_journey: number;
  h_bau: number;
  weekly_limit: number;
}

/** Ownership §9: H_journey + H_BAU > 40 */
export function computeOwnershipOverload(
  h_journey: number,
  h_bau: number,
  weekly_limit = 40,
): OverloadFlag {
  return {
    raised: h_journey + h_bau > weekly_limit,
    h_journey,
    h_bau,
    weekly_limit,
  };
}

export interface ConfidenceFlags {
  overconfidence: boolean;
  underconfidence: boolean;
  volatility: boolean;
  calibration_gap: number; // confidence − performance, in [-1,1]
}

/**
 * Confidence §10: surface signal flags separately from the score.
 * - overconfidence: confidence high relative to performance
 * - underconfidence: confidence low relative to performance
 * - volatility: confidence stability x_4 below threshold
 */
export function computeConfidenceFlags(args: {
  selfRatedScaled: number;       // s for C_x1 (or rolling self-rate − 0.5)
  performanceScaled: number;     // s aggregated from scenario performance / quality
  stabilityScaled: number;       // s for C_x4
  cfg: NonNullable<ScoringConfig['confidence_flags']>;
}): ConfidenceFlags {
  const calibration_gap = args.selfRatedScaled - args.performanceScaled;
  return {
    overconfidence:  calibration_gap >  args.cfg.overconfidence_threshold,
    underconfidence: calibration_gap <  args.cfg.underconfidence_threshold,
    volatility:      args.stabilityScaled < -args.cfg.volatility_threshold,
    calibration_gap,
  };
}

// ─── Score band (Practical Score Interpretation §11/§10/§10) ────

export function getScoreBand(displayScore: number): { label: string; color: string; raw_range: string } {
  // raw → display: 50·(raw+1)
  // -1.00 to -0.60 → 0..20
  // -0.59 to -0.20 → 21..40
  // -0.19 to 0.19  → 41..59
  // 0.20 to 0.59   → 60..79
  // 0.60 to 1.00   → 80..100
  if (displayScore >= 80) return { label: 'Materially above expected', color: 'amp-success',  raw_range: '0.60 to 1.00' };
  if (displayScore >= 60) return { label: 'Above expected',            color: 'amp-info',     raw_range: '0.20 to 0.59' };
  if (displayScore >= 41) return { label: 'Baseline / expected',       color: 'amp-warning',  raw_range: '-0.19 to 0.19' };
  if (displayScore >= 21) return { label: 'Below expected',            color: 'amp-risk',     raw_range: '-0.59 to -0.20' };
  return                   { label: 'Materially below expected',       color: 'destructive',  raw_range: '-1.00 to -0.60' };
}

export function validateWeights(traits: Record<string, TraitConfig>): { valid: boolean; sum: number } {
  const sum = Object.values(traits).reduce((s, t) => s + t.weight, 0);
  return { valid: Math.abs(sum - 1.0) < 0.01, sum: Math.round(sum * 1000) / 1000 };
}

// ─── Backward-compatible aliases used by older code ─────────────
// These are deliberately thin wrappers so the rest of the platform keeps
// compiling while pages migrate to the new typed API.

/** @deprecated use computePillar */
export function calculateDimensionScore(
  traitObservations: Record<string, number>,
  traitConfig: Record<string, TraitConfig>,
  _lambda: number,
) {
  const trait_details: Record<string, { observed: number; scaled: number; weight: number }> = {};
  let raw = 0;
  for (const [k, cfg] of Object.entries(traitConfig)) {
    const x = traitObservations[k] ?? cfg.baseline_mean;
    const s = scaleTrait(x, cfg.baseline_mean, cfg.baseline_sd);
    raw += cfg.weight * s;
    trait_details[k] = { observed: x, scaled: s, weight: cfg.weight };
  }
  raw = clip1(raw);
  return { raw, dashboard: pillarScore100(raw), traitDetails: trait_details };
}

/** @deprecated use computeAdoption */
export function adoptionScore(
  participation_100: number,
  ownership_100: number,
  confidence_100: number,
  phase: string,
  phaseWeights: Record<string, PhaseWeights>,
): number {
  const w = phaseWeights[phase] ?? phaseWeights.baseline ?? { participation: 0.20, ownership: 0.40, confidence: 0.40 };
  return participation_100 * w.participation + ownership_100 * w.ownership + confidence_100 * w.confidence;
}

/** @deprecated use pillarScore100 */
export function dashboardScore(raw: number): number {
  return pillarScore100(raw);
}

/** @deprecated use timeProgress */
export function durationProgressRatio(now: Date, start: Date, end: Date): number {
  return timeProgress(now, start, end);
}
