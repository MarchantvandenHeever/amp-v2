import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { initiative_id, journey_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent insights and journey structure
    let insightsQuery = supabase.from("insight_records").select("*").eq("status", "new").order("created_at", { ascending: false }).limit(50);
    if (initiative_id) insightsQuery = insightsQuery.eq("initiative_id", initiative_id);
    const { data: insights } = await insightsQuery;

    let itemsQuery = supabase.from("journey_items").select("*").order("order_index");
    if (journey_id) itemsQuery = itemsQuery.eq("journey_id", journey_id);
    const { data: journeyItems } = await itemsQuery;

    const { data: milestones } = await supabase.from("milestones").select("*").eq("initiative_id", initiative_id || "");

    const prompt = `Based on the following behavioural insights and current journey structure, generate targeted recommendations for journey improvements.

Insights: ${JSON.stringify((insights || []).map(i => ({ type: i.insight_type, summary: i.summary, severity: i.severity, dimension: i.inferred_dimension, persona: i.persona })))}

Current journey items: ${JSON.stringify((journeyItems || []).map(i => ({ id: i.id, title: i.title, type: i.type, contributes_to: i.contributes_to, status: i.status })))}

Milestones: ${JSON.stringify(milestones || [])}

Recommendation types: add_item, edit_item, resequence_item, add_nudge, add_manager_action, add_confidence_check, add_evidence_task, add_role_explainer, add_simulation, split_path_by_persona, simplify_phase, escalation

For each recommendation, provide the proposed change as structured JSON.`;

    const tools = [{
      type: "function",
      function: {
        name: "generate_recommendations",
        description: "Return structured recommendations for journey improvements.",
        parameters: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation_type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  rationale: { type: "string" },
                  impacted_personas: { type: "array", items: { type: "string" } },
                  expected_impact: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  priority: { type: "number" },
                  proposed_change: { type: "object", description: "The specific change to apply" },
                },
                required: ["recommendation_type", "title", "description", "rationale", "severity", "priority"],
              },
            },
          },
          required: ["recommendations"],
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
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    let recommendations: any[] = [];

    const tc = result.choices?.[0]?.message?.tool_calls?.[0];
    if (tc?.function?.name === "generate_recommendations") {
      try {
        recommendations = JSON.parse(tc.function.arguments).recommendations || [];
      } catch { /* ignore */ }
    }

    // Save recommendations
    const insightIds = (insights || []).map(i => i.id);
    let saved = 0;
    for (const rec of recommendations) {
      const { error } = await supabase.from("recommendation_records").insert({
        initiative_id: initiative_id || null,
        journey_id: journey_id || null,
        recommendation_type: rec.recommendation_type,
        title: rec.title,
        description: rec.description,
        rationale: rec.rationale,
        linked_insight_ids: insightIds.slice(0, 10),
        impacted_personas: rec.impacted_personas || [],
        expected_impact: rec.expected_impact || null,
        severity: rec.severity,
        priority: rec.priority || 50,
        proposed_change_json: rec.proposed_change || {},
        review_status: "pending",
      });
      if (!error) saved++;
    }

    // Mark insights as reviewed
    if (insights?.length) {
      await supabase.from("insight_records").update({ status: "reviewed" }).in("id", insightIds);
    }

    return new Response(JSON.stringify({ recommendations_count: saved, recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-recommendation-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
