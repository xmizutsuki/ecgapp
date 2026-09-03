// Supabase Edge Function: ecg-tutor
// Secrets required: OPENAI_API_KEY
// Optional: OPENAI_MODEL (default: gpt-5.6-luna)
// Deploy with: supabase functions deploy ecg-tutor

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

    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: anonKey },
    });
    if (!userCheck.ok) return json({ error: "Invalid session." }, 401);

    const body = await req.json();
    const language = body?.language === "en" ? "en" : "pt-BR";
    const mode = body?.mode === "case-feedback" ? "case-feedback" : "tutor";

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

    if (mode === "case-feedback") {
      return await handleCaseFeedback(body, language, apiKey);
    }
    return await handleTutor(body, language, apiKey);
  } catch (e) {
    return json({ error: e?.message || "Internal error." }, 500);
  }
});

async function handleTutor(body: any, language: string, apiKey: string) {
  const message = body?.message;
  if (!message || typeof message !== "string" || message.length > 3000) {
    return json({ error: language === "en" ? "Invalid message." : "Mensagem inválida." }, 400);
  }

  const instructions = language === "en"
    ? `You are CardioTutor, ECG Lab's EDUCATIONAL electrocardiography tutor.
Respond in clear international English and use a structured teaching style.
Teach a systematic method: rate, regularity, P wave, PR, QRS, axis when relevant, ST-T, and conclusion.
Do not diagnose real-patient ECGs, replace clinical assessment, or provide individualized emergency management.
If the user provides real-patient data or requests individualized diagnosis/management, explain the limitation and redirect to general educational principles.
Be concise while showing the clinical reasoning.`
    : `Você é o CardioTutor do ECG Lab, um tutor EDUCACIONAL de eletrocardiografia.
Responda em português brasileiro, de forma didática e estruturada.
Ensine um método sistemático: frequência, regularidade, onda P, PR, QRS, eixo quando pertinente, ST-T e conclusão.
Não diagnostique ECGs reais de pacientes, não substitua avaliação clínica e não dê conduta individualizada de emergência.
Se o usuário fornecer dados de um paciente real ou pedir diagnóstico/conduta individual, explique a limitação e redirecione para princípios educacionais gerais.
Seja conciso, mas explique o raciocínio.`;

  const data = await openAI(apiKey, instructions, message, 700);
  const reply = extractText(data) || (language === "en"
    ? "I could not generate a response right now."
    : "Não consegui gerar uma resposta agora.");
  return json({ reply }, 200);
}

async function handleCaseFeedback(body: any, language: string, apiKey: string) {
  const answer = body?.student_answer;
  const c = body?.case_data;
  if (!answer || typeof answer !== "string" || answer.length < 12 || answer.length > 5000 || !c || typeof c !== "object") {
    return json({ error: language === "en" ? "Invalid case feedback payload." : "Dados inválidos para correção do caso." }, 400);
  }

  const instructions = language === "en"
    ? `You are CardioTutor's CaseCoach, an EDUCATIONAL ECG reasoning evaluator.
The supplied case is fictional and belongs to ECG Lab. Evaluate the student's reasoning against the supplied reference answer and reference reasoning.
Score the reasoning from 0 to 100. Reward correct observations, even when the final diagnosis is wrong. Identify concrete mistakes, explain likely reasoning errors, and provide a concise step-by-step model approach.
Do not introduce patient-specific medical advice. Do not claim certainty beyond the supplied educational case.
Return ONLY valid JSON, with no Markdown, using exactly these keys:
{"score":number,"verdict":string,"summary":string,"strengths":string[],"corrections":string[],"error_reasons":string[],"correct_reasoning":string[],"ideal_answer":string,"next_time":string[]}
Keep each array to 1–5 concise items.`
    : `Você é o CaseCoach do CardioTutor, um avaliador EDUCACIONAL de raciocínio em ECG.
O caso fornecido é fictício e pertence ao ECG Lab. Avalie o raciocínio do estudante comparando-o com a resposta esperada e o raciocínio de referência fornecidos.
Dê nota de 0 a 100. Valorize observações corretas mesmo quando o diagnóstico final estiver errado. Identifique erros concretos, explique causas prováveis do erro de raciocínio e forneça um modelo conciso passo a passo.
Não ofereça conduta individualizada para paciente real. Não afirme certeza além do caso educacional fornecido.
Retorne SOMENTE JSON válido, sem Markdown, usando exatamente estas chaves:
{"score":number,"verdict":string,"summary":string,"strengths":string[],"corrections":string[],"error_reasons":string[],"correct_reasoning":string[],"ideal_answer":string,"next_time":string[]}
Mantenha cada lista com 1–5 itens concisos.`;

  const input = JSON.stringify({
    student_answer: answer,
    case: sanitizeCase(c),
  });

  const data = await openAI(apiKey, instructions, input, 1200);
  const raw = extractText(data);
  const parsed = parseJsonObject(raw);
  if (!parsed) {
    return json({ error: language === "en" ? "AI returned an invalid feedback format." : "A IA retornou um formato de feedback inválido." }, 502);
  }
  return json({ feedback: normalizeFeedback(parsed, language) }, 200);
}

function sanitizeCase(c: any) {
  const allowed = [
    "title", "chief_complaint", "anamnesis", "medications", "vitals", "physical_exam",
    "labs", "imaging", "question", "expected_answer", "reference_reasoning", "trap", "learning_point",
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (c?.[key] !== undefined) out[key] = c[key];
  }
  return out;
}

async function openAI(apiKey: string, instructions: string, input: string, maxOutputTokens: number) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna",
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "AI service error.");
  return data;
}

function parseJsonObject(text: string) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(s.slice(first, last + 1));
  } catch {
    return null;
  }
}

function normalizeFeedback(v: any, language: string) {
  const list = (x: any) => Array.isArray(x)
    ? x.filter((y) => typeof y === "string" && y.trim()).slice(0, 5)
    : [];
  const str = (x: any) => typeof x === "string" ? x.slice(0, 4000) : "";
  const score = Math.max(0, Math.min(100, Math.round(Number(v?.score) || 0)));
  return {
    score,
    verdict: str(v?.verdict) || (language === "en" ? "Case review" : "Revisão do caso"),
    summary: str(v?.summary),
    strengths: list(v?.strengths),
    corrections: list(v?.corrections),
    error_reasons: list(v?.error_reasons),
    correct_reasoning: list(v?.correct_reasoning),
    ideal_answer: str(v?.ideal_answer),
    next_time: list(v?.next_time),
  };
}

function extractText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  const out = response?.output || [];
  const chunks: string[] = [];
  for (const item of out) {
    for (const c of item?.content || []) {
      if (c?.type === "output_text" && c?.text) chunks.push(c.text);
    }
  }
  return chunks.join("\n");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
