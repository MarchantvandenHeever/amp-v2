import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { initiative_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      supabase.from("scores").select("*, profiles(display_name, team, persona)").eq("initiative_id", initiative_id || "").limit(100),
      supabase.from("reminders").select("*").order("sent_at", { ascending: false }).limit(100),
      supabase.from("risk_flags").select("*").eq("resolved", false).limit(50),
    ]);

    const prompt = `Analyse the following AMP platform data and extract structured behavioural insights.

Focus on patterns like:
- Confusion themes from support conversations
- Repeated support requests on same topics
- Low confidence patterns (users expressing uncertainty)
- Weak ownership (completing tasks but not applying)
- Reminder dependency (users only acting after reminders)
- Stalled workflow items
- High-risk milestones
- Champion candidates (high engagement + evidence)

Platform Data:
- Recent support messages: ${JSON.stringify((messages || []).slice(0, 50).map(m => ({ role: m.role, content: m.content?.substring(0, 200), signals: m.structured_output })))}
- Activity events: ${JSON.stringify((events || []).slice(0, 30))}
- Current scores: ${JSON.stringify((scores || []).slice(0, 20))}
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
