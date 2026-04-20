import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check: require change_manager or super_admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerUserId = userData.user.id;

    // Role check via service role client
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: callerUserId, _role: "change_manager" });
    const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: callerUserId, _role: "super_admin" });
    if (!roleCheck && !adminCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: requires change_manager or super_admin role" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, initiative_id, journey_id, personas, milestones, existing_items, conversation_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context for the AI
    const systemPrompt = `You are the AMP Journey Builder Agent — an AI copilot embedded in the AMP behavioural adoption platform.

You help change managers design hyper-personalised adoption journeys. You understand AMP's behavioural model:
- Participation (20% weight): exposure, engagement, completion of learning and activities
- Ownership (40% weight): evidence of responsibility, application, teaching others
- Confidence (40% weight): self-reported belief + readiness calibrated against behaviour

Your role:
1. Translate initiative context into journey structure
2. Generate persona-specific journey drafts
3. Suggest phases, milestones, and behavioural goals
4. Recommend workflow items: communications, learning, tasks, nudges, evidence requests, confidence checks, reflections, simulations, manager interventions
5. Explain WHY each item exists
6. Map each item to Participation, Ownership, or Confidence
7. Suggest data-driven micro-improvements

Available item types: content, activity, form, confidence_check, evidence_upload, reflection, scenario

When suggesting journey items, use the suggest_journey_items tool to return structured data.

Current context:
- Initiative: ${initiative_id || 'Not specified'}
- Journey: ${journey_id || 'Not specified'}
- Personas: ${JSON.stringify(personas || [])}
- Milestones: ${JSON.stringify(milestones || [])}
- Existing items: ${JSON.stringify((existing_items || []).map((i: any) => ({ title: i.title, type: i.type, contributes_to: i.contributes_to })))}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_journey_items",
          description: "Return structured journey item suggestions for the change manager to review and insert.",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Item title" },
                    description: { type: "string", description: "What this item does" },
                    type: { type: "string", enum: ["content", "activity", "form", "confidence_check", "evidence_upload", "reflection", "scenario"] },
                    contributes_to: { type: "array", items: { type: "string", enum: ["participation", "ownership", "confidence"] } },
                    rationale: { type: "string", description: "Why this item is recommended" },
                    weight: { type: "number", description: "Suggested weight 1-100" },
                    duration: { type: "string", description: "Estimated duration e.g. '5 min', '15 min'" },
                    mandatory: { type: "boolean" },
                    behavioural_objective: { type: "string" },
                    intended_signal: { type: "string" },
                    linked_milestone: { type: "string", description: "Which milestone this maps to" },
                  },
                  required: ["title", "description", "type", "contributes_to", "rationale", "weight", "duration", "mandatory"],
                },
              },
              overall_rationale: { type: "string", description: "Overall explanation of the suggestions" },
            },
            required: ["suggestions", "overall_rationale"],
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    const choice = result.choices?.[0];

    let assistantContent = choice?.message?.content || "";
    let suggestions = null;

    // Extract tool call results
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        if (tc.function?.name === "suggest_journey_items") {
          try {
            suggestions = JSON.parse(tc.function.arguments);
          } catch { /* ignore parse errors */ }
        }
      }
    }

    // Save messages to conversation if conversation_id provided
    if (conversation_id && messages?.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
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
        content: assistantContent || (suggestions ? "Here are my suggestions:" : ""),
        structured_output: suggestions,
      });
    }

    return new Response(JSON.stringify({
      content: assistantContent,
      suggestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-journey-builder error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
