// Extract form fields from an uploaded PDF or Word document using Lovable AI.
// Accepts multipart/form-data with `file` (pdf/docx/doc/txt) and optional `formType`.
// Returns { title, description, fields: [{ label, type, required, options?, min?, max? }] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Minimal text extraction from .docx (which is a zip containing word/document.xml)
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  // Use the standard Web API DecompressionStream + a tiny zip reader.
  // Easiest: use `jszip` via esm.sh.
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "";
  // Strip XML tags but preserve paragraph breaks
  const withBreaks = docXml
    .replace(/<w:p[ >][^]*?<\/w:p>/g, (m) => m + "\n")
    .replace(/<[^>]+>/g, "");
  return withBreaks
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Use pdfjs-dist via esm.sh (legacy build for non-browser env)
  const pdfjsLib: any = await import(
    "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs"
  );
  // Disable worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  let out = "";
  const maxPages = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strs = content.items.map((it: any) => it.str || "");
    out += strs.join(" ") + "\n\n";
  }
  return out.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json(500, { error: "LOVABLE_API_KEY not configured" });

    const form = await req.formData();
    const file = form.get("file");
    const formType = (form.get("formType") as string) || "standard_form";
    if (!(file instanceof File)) return json(400, { error: "Missing file" });
    if (file.size > 20 * 1024 * 1024) return json(400, { error: "File too large (max 20MB)" });

    const name = file.name.toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());

    let text = "";
    try {
      if (name.endsWith(".docx")) {
        text = await extractDocxText(bytes);
      } else if (name.endsWith(".pdf")) {
        text = await extractPdfText(bytes);
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        text = new TextDecoder().decode(bytes);
      } else if (name.endsWith(".doc")) {
        return json(400, {
          error: "Legacy .doc not supported. Please convert to .docx or PDF.",
        });
      } else {
        return json(400, { error: "Unsupported file type. Use PDF, DOCX, or TXT." });
      }
    } catch (e) {
      console.error("extraction error:", e);
      return json(400, { error: "Could not read document contents." });
    }

    const trimmed = text.slice(0, 25000);
    if (trimmed.trim().length < 20) {
      return json(400, { error: "Document appears empty or unreadable." });
    }

    const isConfidence = formType === "confidence_form";
    const systemPrompt = isConfidence
      ? "You convert documents into CONFIDENCE survey forms. Generate rating-scale questions (type='rating', typically min=1 max=5) that measure user confidence, readiness, or sentiment about the topics in the document. Add a few short_text fields for open feedback when appropriate."
      : "You convert documents into structured forms/surveys. Read the content and produce a clean set of form fields capturing the questions, inputs, or data the document is asking for. Infer sensible field types.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              `Generate a form from this document. Pick a concise title and short description. Then list 3-20 fields.\n\n--- DOCUMENT ---\n${trimmed}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_form",
              description: "Return the structured form generated from the document.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        type: {
                          type: "string",
                          enum: [
                            "short_text",
                            "long_text",
                            "number",
                            "select",
                            "multi_select",
                            "checkbox",
                            "radio",
                            "rating",
                            "date",
                            "email",
                          ],
                        },
                        required: { type: "boolean" },
                        options: { type: "array", items: { type: "string" } },
                        min: { type: "number" },
                        max: { type: "number" },
                        helpText: { type: "string" },
                      },
                      required: ["label", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "fields"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_form" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429) return json(429, { error: "AI rate limit exceeded. Try again shortly." });
      if (aiResp.status === 402) return json(402, { error: "AI credits exhausted. Add credits in Settings." });
      return json(500, { error: "AI extraction failed" });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return json(500, { error: "AI returned no fields" });

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return json(500, { error: "AI returned invalid JSON" });
    }

    return json(200, {
      title: parsed.title || file.name.replace(/\.[^.]+$/, ""),
      description: parsed.description || "",
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      sourceFileName: file.name,
    });
  } catch (e) {
    console.error("extract-form-from-document error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
