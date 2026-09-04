// ECG Lab — performance-insight Edge Function
// Interprets structured learning aggregates only; objective scores stay client-calculated.
// Primary provider: Groq. Secret required: GROQ_API_KEY.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "User not authenticated." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase environment is not configured." }, 500);

    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: anonKey },
    });
    if (!userCheck.ok) return json({ error: "Invalid session." }, 401);

    const body = await req.json();
    const language = body?.language === "en" ? "en" : "pt-BR";
    const performance = sanitizePerformance(body?.performance);
    if (!performance) {
      return json({ error: language === "en" ? "Invalid performance payload." : "Dados de desempenho inválidos." }, 400);
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return json({ error: "AI service is not configured." }, 503);

    const instructions = language === "en"
      ? `You are ECG Lab's EDUCATIONAL learning-performance analyst. Interpret ONLY the structured metrics supplied by the application. Never recalculate, change, infer new percentages, or invent statistics. Never claim certification, diagnosis ability, or clinical competence. A weakness can be described as recurring only when the supplied attempts/errors support it. Return ONLY valid JSON with exactly these keys: {"summary":string,"patterns":string[],"recommendations":string[]}. Summary: 2-4 concise sentences. At most 4 concise patterns and 4 recommendations.`
      : `Você é o analista EDUCACIONAL de desempenho do ECG Lab. Interprete SOMENTE as métricas estruturadas fornecidas pelo aplicativo. Nunca recalcule, altere, infira novos percentuais ou invente estatísticas. Nunca afirme certificação, capacidade diagnóstica ou competência clínica. Uma dificuldade só pode ser descrita como recorrente quando as tentativas/erros fornecidos sustentarem isso. Retorne SOMENTE JSON válido com exatamente estas chaves: {"summary":string,"patterns":string[],"recommendations":string[]}. Resumo: 2 a 4 frases concisas. No máximo 4 padrões e 4 recomendações concisas.`;

    const raw = await groqJson(apiKey, instructions, JSON.stringify(performance));
    const parsed = parseJsonObject(raw);
    if (!parsed) return json({ error: language === "en" ? "AI returned an invalid format." : "A IA retornou um formato inválido." }, 502);

    return json({ insight: {
      summary: cleanString(parsed.summary),
      patterns: cleanList(parsed.patterns),
      recommendations: cleanList(parsed.recommendations),
    }});
  } catch (e) {
    const msg = friendlyError(e);
    return json({ error: msg }, errorStatus(e));
  }
});

function sanitizePerformance(v: any) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const raw = JSON.stringify(v);
  if (raw.length > 20000) return null;
  const allowed = ["mastery","trend","confidence","componentScores","weakestCompetencies","recentErrors","clinicalReasoningPatterns"];
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (v[key] !== undefined) out[key] = v[key];
  return out;
}

async function groqJson(apiKey: string, instructions: string, input: string) {
  const preferred = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b";
  const fallback = Deno.env.get("GROQ_FALLBACK_MODEL") || "llama-3.1-8b-instant";
  const models = [...new Set([preferred, fallback].filter(Boolean))];
  let lastError: any = null;
  for (const model of models) {
    try { return await callGroq(apiKey, model, instructions, input); }
    catch (e) { lastError = e; if (!isModelAvailabilityError(e)) throw e; }
  }
  throw lastError || new Error("No AI model is available.");
}

async function callGroq(apiKey: string, model: string, instructions: string, input: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "system", content: instructions }, { role: "user", content: input }],
      max_completion_tokens: 900,
      temperature: 0.2,
      response_format: { type: "json_object" },
    };
    if (model.startsWith("openai/gpt-oss-")) body.reasoning_effort = "low";
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const err: any = new Error(data?.error?.message || `AI service error (${r.status}).`); err.status=r.status; throw err; }
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") throw new Error("AI returned no text.");
    return text;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error("AI request timed out.");
    throw e;
  } finally { clearTimeout(timer); }
}

function isModelAvailabilityError(e: any) {
  const msg=e?.message||"";
  return e?.status===404 || /model.*(not found|decommissioned|unavailable|does not exist)|invalid model/i.test(msg);
}
function parseJsonObject(text: string) {
  if (!text) return null;
  const s=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");
  const a=s.indexOf("{"),b=s.lastIndexOf("}");
  if(a<0||b<=a)return null;
  try{return JSON.parse(s.slice(a,b+1))}catch{return null}
}
const cleanString=(v:any)=>typeof v==="string"?v.trim().slice(0,3000):"";
const cleanList=(v:any)=>Array.isArray(v)?v.filter(x=>typeof x==="string"&&x.trim()).slice(0,4).map(cleanString):[];
function friendlyError(e:any){
  const msg=e?.message||String(e||"Internal error.");
  if(/quota|rate limit|too many requests|429/i.test(msg))return "Limite temporário da IA atingido. Tente novamente mais tarde.";
  if(/timed out|timeout/i.test(msg))return "A IA demorou mais que o esperado. Tente novamente.";
  return msg;
}
function errorStatus(e:any){if(e?.status===429||/quota|rate limit|too many requests/i.test(e?.message||""))return 429;if(e?.status===401||e?.status===403)return e.status;return 500}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
