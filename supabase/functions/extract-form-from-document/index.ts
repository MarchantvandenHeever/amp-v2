// Document → Form Extractor edge function
// Extracts text from DOCX/PDF/TXT/MD then asks Lovable AI to convert it
// into the AMP form schema (sections + questions + scales + per-field confidence).
// Public endpoint (verify_jwt = false in config.toml) because the app uses a
// custom profile-based session, not real Supabase auth.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("https://esm.sh/unpdf@0.12.1");
  const { text } = await extractText(bytes, { mergePages: true });
  return (typeof text === "string" ? text : (text as string[]).join("\n\n")).trim();
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const JSZipMod: any = await import("npm:jszip@3.10.1");
  const JSZip = JSZipMod.default || JSZipMod;
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("Invalid DOCX: missing word/document.xml");
  const withBreaks = docXml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  const decoded = stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\n{3,}/g, "\n\n").trim();
}

async function extractText(bytes: Uint8Array, mime: string, name: string): Promise<string> {
  const lower = name.toLowerCase();
  if (mime.includes("pdf") || lower.endsWith(".pdf")) return extractPdfText(bytes);
  if (mime.includes("officedocument.wordprocessingml") || lower.endsWith(".docx")) return extractDocxText(bytes);
  return new TextDecoder().decode(bytes);
}

const SYSTEM_PROMPT = `You are a precision document parser for the AMP change-management platform.
Convert raw text from an uploaded form/assessment document into a clean, structured AMP form schema.

Rules:
- Extract every question in the order they appear.
- Detect labels: "Activity Title", "Activity Type", "Phase", "Focus", "Purpose", "User Instruction", "Q1", "Q2", "Type:", "Scale labels:", "Suggested Completion Message".
- Map question types to one of: short_text, paragraph, multiple_choice, checkbox, dropdown, likert, yes_no, date, time, section_header.
- For likert / linear scales, populate scale.min, scale.max, and scale.labels (string-keyed map of position → label, e.g. {"1":"Strongly disagree","5":"Strongly agree"}).
- For multiple_choice / checkbox / dropdown, populate options as an array of strings.
- If a question is ambiguous, set needsReview=true and provide your best guess. Set extractionConfidence between 0 and 1.
- Group questions into sections only when section headings clearly exist; otherwise produce a single section with title="" and empty description.
- Capture user instruction text into userInstruction. Capture the final thank-you / completion message into completionMessage.
- Never invent questions that aren't in the document.`;

const FORM_TOOL = {
  type: "function",
  function: {
    name: "build_form",
    description: "Return the structured AMP form schema extracted from the document.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        activityType: { type: "string" },
        phase: { type: "string" },
        focus: { type: "string" },
        purpose: { type: "string" },
        userInstruction: { type: "string" },
        completionMessage: { type: "string" },
        extractionConfidence: { type: "number", minimum: 0, maximum: 1 },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    type: {
                      type: "string",
                      enum: [
                        "short_text", "paragraph", "multiple_choice", "checkbox",
                        "dropdown", "likert", "yes_no", "date", "time", "section_header",
                      ],
                    },
                    required: { type: "boolean" },
                    helpText: { type: "string" },
                    needsReview: { type: "boolean" },
                    extractionConfidence: { type: "number", minimum: 0, maximum: 1 },
                    options: { type: "array", items: { type: "string" } },
                    scale: {
                      type: "object",
                      properties: {
                        min: { type: "number" },
                        max: { type: "number" },
                        labels: { type: "object", additionalProperties: { type: "string" } },
                      },
                    },
                  },
                  required: ["label", "type"],
                },
              },
            },
            required: ["title", "questions"],
          },
        },
      },
      required: ["title", "sections"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { fileBase64, fileName, mimeType } = body || {};
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 and fileName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = base64ToBytes(fileBase64);
    if (bytes.length > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 25MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rawText = "";
    try {
      rawText = await extractText(bytes, mimeType || "", fileName);
    } catch (e) {
      console.error("Text extraction failed:", e);
      return new Response(JSON.stringify({ error: `Could not extract text: ${(e as Error).message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawText || rawText.length < 20) {
      return new Response(JSON.stringify({ error: "Document appears empty or unreadable." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = rawText.length > 30000 ? rawText.slice(0, 30000) : rawText;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Document name: ${fileName}\n\n--- DOCUMENT TEXT START ---\n${truncated}\n--- DOCUMENT TEXT END ---\n\nReturn the form schema via the build_form tool.`,
          },
        ],
        tools: [FORM_TOOL],
        tool_choice: { type: "function", function: { name: "build_form" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response", JSON.stringify(aiJson).slice(0, 1000));
      return new Response(JSON.stringify({ error: "AI did not return a structured form." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid JSON." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      parsed.sections = [{ title: "", description: "", questions: [] }];
    }

    return new Response(JSON.stringify({ form: parsed, rawTextPreview: truncated.slice(0, 500) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-form-from-document error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
