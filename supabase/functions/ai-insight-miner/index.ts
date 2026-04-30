import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { initiative_id, caller_user_id } = body;

    // Demo-mode auth: validate caller via profile + role (this app uses demo logins, not Supabase auth)
    if (!caller_user_id) {
      return new Response(JSON.stringify({ error: "Missing caller_user_id" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", caller_user_id).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["change_manager", "super_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: requires change_manager or super_admin role" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerUserId = profile.id;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Gather platform data
    const [
      { data: messages },
      { data: events },
      { data: scores },
      { data: reminders },
      { data: riskFlags },
    ] = await Promise.all([
      supabase.from("agent_messages").select("*, agent_conversations(initiative_id, user_id, context_type)").order("created_at", { ascending: false }).limit(200),
      supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(200),
      initiative_id
        ? supabase.from("scores").select("*, profiles(display_name, team, persona)").eq("initiative_id", initiative_id).limit(200)
        : supabase.from("scores").select("*, profiles(display_name, team, persona)").limit(200),
      supabase.from("reminders").select("*").order("sent_at", { ascending: false }).limit(100),
      supabase.from("risk_flags").select("*").eq("resolved", false).limit(50),
    ]);

    // Compute Adoption Performance (ΔA = actual − ideal, both p-scaled).
    // This is the primary signal: pillar/adoption dashboard scores are scaled by
    // time-progress, so ΔA directly captures whether users are ahead/behind plan.
    const scoredRows = (scores || []).map((s: any) => {
      const actual = Number(s.adoption_dashboard ?? 0);
      const ideal = Number(s.adoption_ideal ?? 0);
      const deltaA_pp = Math.round(actual - ideal);
      return {
        user_id: s.user_id,
        team: s.profiles?.team,
        persona: s.profiles?.persona,
        display_name: s.profiles?.display_name,
        participation_dashboard: Math.round(Number(s.participation_dashboard ?? 0)),
        ownership_dashboard: Math.round(Number(s.ownership_dashboard ?? 0)),
        confidence_dashboard: Math.round(Number(s.confidence_dashboard ?? 0)),
        adoption_dashboard: Math.round(actual),
        adoption_ideal: Math.round(ideal),
        deltaA_pp,
        performance_band:
          deltaA_pp >= 5 ? 'ahead' :
          deltaA_pp >= -5 ? 'on_track' :
          deltaA_pp >= -15 ? 'behind' : 'at_risk',
      };
    });

    const avgDeltaA = scoredRows.length
      ? Math.round(scoredRows.reduce((a, r) => a + r.deltaA_pp, 0) / scoredRows.length)
      : 0;
    const atRiskCount = scoredRows.filter(r => r.performance_band === 'at_risk').length;
    const behindCount = scoredRows.filter(r => r.performance_band === 'behind').length;

    const prompt = `Analyse the following AMP platform data and extract structured behavioural insights.

PRIMARY PERFORMANCE METRIC — Adoption Performance (ΔA):
  ΔA = adoption_dashboard − adoption_ideal  (in percentage-points)
  Both values are already scaled by time-progress, so ΔA directly measures
  whether a user/cohort is ahead of or behind the ideal adoption trajectory.
  Bands: ahead (≥+5pp), on_track (−5..+5pp), behind (−15..−5pp), at_risk (<−15pp).

Cohort summary:
  - Avg ΔA across users: ${avgDeltaA} pp
  - Users at risk (ΔA < −15pp): ${atRiskCount}
  - Users behind (−15..−5pp): ${behindCount}

Generate insights that:
  1. Prioritise users/teams/personas with the largest negative ΔA (worst performance gap).
  2. Explain WHY adoption is lagging using the pillar dashboard scores
     (participation, ownership, confidence) — these are also p-scaled.
  3. Surface confusion themes, repeated support requests, low-confidence patterns,
     weak ownership, reminder dependency, stalled items.
  4. Identify champion candidates (large positive ΔA + strong evidence).

Severity rule: severity should track ΔA — at_risk → high/critical, behind → medium,
on_track → low, ahead → low (champion).

Platform Data:
- User performance rows (sorted worst-first): ${JSON.stringify(
      scoredRows.sort((a, b) => a.deltaA_pp - b.deltaA_pp).slice(0, 30)
    )}
- Recent support messages: ${JSON.stringify((messages || []).slice(0, 50).map(m => ({ role: m.role, content: m.content?.substring(0, 200), signals: m.structured_output })))}
- Activity events: ${JSON.stringify((events || []).slice(0, 30))}
- Reminders sent: ${reminders?.length || 0}
- Active risk flags: ${riskFlags?.length || 0}

Return insights using the extract_insights tool.`;

    const tools = [{
      type: "function",
      function: {
        name: "extract_insights",
        description: "Return structured insights from platform behaviour analysis.",
        parameters: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight_type: { type: "string" },
                  topic: { type: "string" },
                  summary: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  confidence_score: { type: "number" },
                  inferred_dimension: { type: "string", enum: ["participation", "ownership", "confidence"] },
                  inferred_issue: { type: "string" },
                  supporting_evidence_summary: { type: "string" },
                  suggested_intervention: { type: "string" },
                  source_type: { type: "string", enum: ["chat", "task", "form", "content", "reminder", "evidence", "system"] },
                  persona: { type: "string" },
                  team: { type: "string" },
                },
                required: ["insight_type", "summary", "severity", "inferred_dimension", "source_type"],
              },
            },
          },
          required: ["insights"],
        },
      },
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools,
        tool_choice: { type: "function", function: { name: "extract_insights" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    let insights: any[] = [];

    const tc = result.choices?.[0]?.message?.tool_calls?.[0];
    if (tc?.function?.name === "extract_insights") {
      try {
        insights = JSON.parse(tc.function.arguments).insights || [];
      } catch { /* ignore */ }
    }

    // Save insights
    let saved = 0;
    for (const insight of insights) {
      const { error } = await supabase.from("insight_records").insert({
        initiative_id: initiative_id || null,
        insight_type: insight.insight_type,
        topic: insight.topic || null,
        summary: insight.summary,
        severity: insight.severity,
        confidence_score: insight.confidence_score || 0,
        inferred_dimension: insight.inferred_dimension,
        inferred_issue: insight.inferred_issue || null,
        supporting_evidence_summary: insight.supporting_evidence_summary || null,
        suggested_intervention: insight.suggested_intervention || null,
        source_type: insight.source_type,
        persona: insight.persona || null,
        team: insight.team || null,
        status: "new",
      });
      if (!error) saved++;
    }

    return new Response(JSON.stringify({ insights_count: saved, insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insight-miner error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
