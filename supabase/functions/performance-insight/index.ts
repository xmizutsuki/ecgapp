// ECG Lab — performance-insight Edge Function
// Receives structured performance aggregates only. AI interprets the supplied numbers; it does not recalculate them.
// Secrets required: OPENAI_API_KEY. Optional: OPENAI_MODEL.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "User not authenticated." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase environment is not configured." }, 500);
    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey: anonKey } });
    if (!userCheck.ok) return json({ error: "Invalid session." }, 401);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);
    const body = await req.json();
    const language = body?.language === "en" ? "en" : "pt-BR";
    const p = body?.performance;
    if (!p || typeof p !== "object") return json({ error: language === "en" ? "Invalid performance payload." : "Dados de desempenho inválidos." }, 400);

    const instructions = language === "en"
      ? `You are ECG Lab's educational performance analyst. Interpret ONLY the structured performance metrics supplied by the application.
Do not recalculate, alter, infer new percentages, or invent statistics. Never claim professional certification or clinical competence.
Identify meaningful learning patterns only when supported by the supplied attempts and recurring-errors data. Do not infer a recurring weakness from a single item.
Return ONLY valid JSON with exactly these keys:
{"summary":string,"patterns":string[],"recommendations":string[]}
The summary should be 2-4 concise sentences. Keep patterns and recommendations to at most 4 items each.`
      : `Você é o analista educacional de desempenho do ECG Lab. Interprete SOMENTE as métricas estruturadas fornecidas pelo aplicativo.
Não recalcule, altere, infira novos percentuais ou invente estatísticas. Nunca afirme certificação profissional ou competência clínica oficial.
Identifique padrões de aprendizagem apenas quando sustentados pelas tentativas e pelos dados de erros recorrentes fornecidos. Não conclua dificuldade recorrente com base em uma única questão.
Retorne SOMENTE JSON válido com exatamente estas chaves:
{"summary":string,"patterns":string[],"recommendations":string[]}
O resumo deve ter 2 a 4 frases concisas. Limite padrões e recomendações a no máximo 4 itens cada.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna",
        instructions,
        input: JSON.stringify(p),
        max_output_tokens: 900,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "AI service error.");
    const parsed = parseJson(extractText(data));
    if (!parsed) return json({ error: language === "en" ? "AI returned an invalid format." : "A IA retornou um formato inválido." }, 502);
    const insight = {
      summary: cleanString(parsed.summary),
      patterns: cleanList(parsed.patterns),
      recommendations: cleanList(parsed.recommendations),
    };
    return json({ insight }, 200);
  } catch (e) {
    return json({ error: e?.message || "Internal error." }, 500);
  }
});

function extractText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  const chunks: string[] = [];
  for (const item of response?.output || []) for (const c of item?.content || []) if (c?.type === "output_text" && c?.text) chunks.push(c.text);
  return chunks.join("\n");
}
function parseJson(text: string) {
  if (!text) return null;
  const s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
const cleanString = (v: any) => typeof v === "string" ? v.trim().slice(0, 3000) : "";
const cleanList = (v: any) => Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 4).map(cleanString) : [];
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
