import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerUserId = claimsData.claims.sub;

    const { messages, user_context, conversation_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use verified caller ID, not client-supplied user_id
    const ctx = user_context || {};
    const verifiedUserId = callerUserId;

    const systemPrompt = `You are the AMP Support Agent — an embedded AI assistant helping end users navigate their adoption journey.

You help users understand:
- What does this change mean for me?
- What do I need to do next?
- How do I complete this task?
- Why does this matter?
- What does good look like?
- What if I am unsure?
- Where can I find the right guidance?

Be warm, encouraging, and specific. Reference their actual journey items and progress when possible.

User context:
- Name: ${ctx.user_name || 'User'}
- Role/Persona: ${ctx.persona || 'Not specified'}
- Team: ${ctx.team || 'Not specified'}
- Current journey items: ${JSON.stringify((ctx.journey_items || []).slice(0, 10).map((i: any) => ({ title: i.title, type: i.type, status: i.status })))}
- Scores: P=${ctx.scores?.participation || 0}, O=${ctx.scores?.ownership || 0}, C=${ctx.scores?.confidence || 0}

After each response, also extract any behavioural signals from the user's message using the extract_signals tool.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "extract_signals",
          description: "Extract behavioural signals from the user's message for insight mining.",
          parameters: {
            type: "object",
            properties: {
              signals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    insight_type: { type: "string", enum: ["confusion", "hesitation", "low_confidence", "weak_ownership", "learning_gap", "role_irrelevance", "workload_friction", "sentiment_drop", "champion_candidate"] },
                    topic: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    inferred_dimension: { type: "string", enum: ["participation", "ownership", "confidence"] },
                    summary: { type: "string" },
                  },
                  required: ["insight_type", "severity", "inferred_dimension", "summary"],
                },
              },
            },
            required: ["signals"],
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    const choice = result.choices?.[0];
    let assistantContent = choice?.message?.content || "";
    let extractedSignals: any[] = [];

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        if (tc.function?.name === "extract_signals") {
          try {
            const parsed = JSON.parse(tc.function.arguments);
            extractedSignals = parsed.signals || [];
          } catch { /* ignore */ }
        }
      }
    }

    // Save messages and signals
    if (conversation_id) {
      const lastUserMsg = messages?.[messages.length - 1];
      if (lastUserMsg?.role === "user") {
        await supabase.from("agent_messages").insert({
          conversation_id,
          role: "user",
          content: lastUserMsg.content,
        });
      }
      await supabase.from("agent_messages").insert({
        conversation_id,
        role: "assistant",
        content: assistantContent,
        structured_output: extractedSignals.length > 0 ? { signals: extractedSignals } : null,
      });

      // Save extracted signals as insight_records using verified user ID
      if (extractedSignals.length > 0 && ctx.initiative_id) {
        for (const signal of extractedSignals) {
          await supabase.from("insight_records").insert({
            initiative_id: ctx.initiative_id,
            journey_id: ctx.journey_id || null,
            user_id: verifiedUserId,
            persona: ctx.persona || null,
            team: ctx.team || null,
            insight_type: signal.insight_type,
            topic: signal.topic || null,
            summary: signal.summary,
            severity: signal.severity,
            inferred_dimension: signal.inferred_dimension,
            source_type: "chat",
            status: "new",
          });
        }
      }
    }

    return new Response(JSON.stringify({
      content: assistantContent,
      signals: extractedSignals,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-support-agent error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
