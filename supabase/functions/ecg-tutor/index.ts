// ECG Lab — CardioTutor / CaseCoach
// Primary provider: Groq
// Secret required: GROQ_API_KEY
// Optional: GROQ_MODEL (default: openai/gpt-oss-20b)
// Optional: GROQ_FALLBACK_MODEL (default: llama-3.1-8b-instant)

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
    const mode = body?.mode === "case-feedback" ? "case-feedback" : "tutor";
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) return json({ error: "GROQ_API_KEY is not configured." }, 500);

    return mode === "case-feedback"
      ? await handleCaseFeedback(body, language, groqKey)
      : await handleTutor(body, language, groqKey);
  } catch (e) {
    return json({ error: friendlyError(e) }, errorStatus(e));
  }
});

async function handleTutor(body: any, language: string, apiKey: string) {
  const message = body?.message;
  if (!message || typeof message !== "string" || message.length > 3000) {
    return json({ error: language === "en" ? "Invalid message." : "Mensagem inválida." }, 400);
  }

  const context = sanitizeTutorContext(body?.context);
  const history = sanitizeHistory(body?.history);
  const socratic = body?.socratic_mode === true;

  if (context?.activityType === "simulation" && context?.examMode === "exam") {
    return json({ error: language === "en"
      ? "AI Tutor is locked until this Exam Mode practice exam is completed."
      : "O Tutor IA fica bloqueado até a finalização deste simulado em Modo Prova." }, 423);
  }

  const preAnswer = !!context && context.answerSubmitted === false;
  const instructions = language === "en"
    ? `You are CardioTutor, ECG Lab's EDUCATIONAL contextual electrocardiography tutor.
Respond in clear international English. Teach a systematic ECG method: rate, regularity, P wave, PR, QRS, axis when relevant, ST-T, and conclusion.
Use the supplied educational screen context naturally.
CRITICAL LEARNING RULE: when context.answerSubmitted is false, never reveal the correct option, diagnosis, reference answer, or wording that gives it away. Give hints and guide reasoning step by step. After submission, explain the answer and why alternatives are wrong.
${socratic ? "SOCRATIC MODE: prefer one focused question at a time and wait for the learner's reasoning." : "Socratic mode is off: explain directly while still protecting unanswered questions."}
ECG Lab tracings are synthetic educational reconstructions. Never claim they are real-patient ECGs. Do not diagnose real-patient ECGs or replace clinical assessment. Be concise, accurate, and educational.`
    : `Você é o CardioTutor do ECG Lab, um tutor EDUCACIONAL e contextual de eletrocardiografia.
Responda em português brasileiro. Ensine um método sistemático de ECG: frequência, regularidade, onda P, PR, QRS, eixo quando pertinente, ST-T e conclusão.
Use naturalmente o contexto educacional da tela fornecido pelo aplicativo.
REGRA PEDAGÓGICA CRÍTICA: quando context.answerSubmitted for false, nunca revele a alternativa correta, o diagnóstico, a resposta de referência ou uma formulação que entregue a resposta. Dê dicas e conduza o raciocínio passo a passo. Após a tentativa, explique a resposta e por que as alternativas estão erradas.
${socratic ? "MODO SOCRÁTICO: prefira uma pergunta focada por vez e aguarde o raciocínio do aluno." : "Modo Socrático desativado: explique diretamente, preservando questões ainda não respondidas."}
Os traçados do ECG Lab são reconstruções educacionais sintéticas. Nunca diga que são ECGs reais de pacientes. Não diagnostique ECGs reais nem substitua avaliação clínica. Seja conciso, preciso e didático.`;

  const input = JSON.stringify({
    learner_message: message,
    context,
    conversation_history: history,
    learning_state: preAnswer ? "pre-answer" : "post-answer-or-general",
    socratic_mode: socratic,
  });

  const reply = await groqText(apiKey, instructions, input, 900, false);
  return json({ reply: reply || (language === "en" ? "I could not generate a response right now." : "Não consegui gerar uma resposta agora.") });
}

async function handleCaseFeedback(body: any, language: string, apiKey: string) {
  const answer = body?.student_answer;
  const c = body?.case_data;
  if (!answer || typeof answer !== "string" || answer.length < 12 || answer.length > 5000 || !c || typeof c !== "object") {
    return json({ error: language === "en" ? "Invalid case feedback payload." : "Dados inválidos para correção do caso." }, 400);
  }

  const instructions = language === "en"
    ? `You are CardioTutor's CaseCoach, an EDUCATIONAL ECG reasoning evaluator. The supplied case is fictional and belongs to ECG Lab. Compare the student's reasoning with the reference answer and reasoning. Score 0-100, reward correct observations even if the final diagnosis is wrong, identify concrete mistakes and likely reasoning errors, and give a concise step-by-step model approach. Return ONLY valid JSON with exactly these keys: {"score":number,"verdict":string,"summary":string,"strengths":string[],"corrections":string[],"error_reasons":string[],"correct_reasoning":string[],"ideal_answer":string,"next_time":string[]}. Keep arrays to 1-5 concise items.`
    : `Você é o CaseCoach do CardioTutor, um avaliador EDUCACIONAL de raciocínio em ECG. O caso é fictício e pertence ao ECG Lab. Compare o raciocínio do estudante com a resposta e o raciocínio de referência. Dê nota de 0 a 100, valorize observações corretas mesmo se o diagnóstico final estiver errado, identifique erros concretos e causas prováveis e apresente um modelo passo a passo conciso. Retorne SOMENTE JSON válido com exatamente estas chaves: {"score":number,"verdict":string,"summary":string,"strengths":string[],"corrections":string[],"error_reasons":string[],"correct_reasoning":string[],"ideal_answer":string,"next_time":string[]}. Mantenha cada lista com 1-5 itens concisos.`;

  const input = JSON.stringify({ student_answer: answer, case: sanitizeCase(c) });
  const raw = await groqText(apiKey, instructions, input, 1200, true);
  const parsed = parseJsonObject(raw);
  if (!parsed) return json({ error: language === "en" ? "AI returned an invalid feedback format." : "A IA retornou um formato de feedback inválido." }, 502);
  return json({ feedback: normalizeFeedback(parsed, language) });
}

function sanitizeTutorContext(value: any) {
  if (!value || typeof value !== "object") return null;
  const allowed = ["language","currentModule","activityType","activityId","questionId","questionText","alternatives","selectedAnswer","answerSubmitted","correctAnswer","explanation","ecgData","caseData","lesson","topic","category","difficulty","sessionProgress","examMode","label","performanceMemory"];
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (value[key] !== undefined) out[key] = value[key];
  if (out.answerSubmitted === false) { delete out.correctAnswer; delete out.explanation; }
  return JSON.parse(JSON.stringify(out).slice(0, 16000));
}

function sanitizeHistory(value: any) {
  if (!Array.isArray(value)) return [];
  return value.slice(-10).flatMap((m: any) => {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = typeof m?.content === "string" ? m.content.slice(0, 2000) : "";
    return role && content ? [{ role, content }] : [];
  });
}

function sanitizeCase(c: any) {
  const allowed = ["title","chief_complaint","anamnesis","medications","vitals","physical_exam","labs","imaging","question","expected_answer","reference_reasoning","trap","learning_point"];
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (c?.[key] !== undefined) out[key] = c[key];
  return out;
}

async function groqText(apiKey: string, systemInstruction: string, input: string, maxOutputTokens: number, jsonMode: boolean) {
  const preferred = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b";
  const fallback = Deno.env.get("GROQ_FALLBACK_MODEL") || "llama-3.1-8b-instant";
  const models = [...new Set([preferred, fallback].filter(Boolean))];
  let lastError: any = null;

  for (const model of models) {
    try {
      return await callGroq(apiKey, model, systemInstruction, input, maxOutputTokens, jsonMode);
    } catch (e) {
      lastError = e;
      if (!isModelAvailabilityError(e)) throw e;
    }
  }
  throw lastError || new Error("No Groq model is available.");
}

async function callGroq(apiKey: string, model: string, systemInstruction: string, input: string, maxOutputTokens: number, jsonMode: boolean) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: input },
      ],
      max_completion_tokens: maxOutputTokens,
      temperature: jsonMode ? 0.2 : 0.35,
    };
    if (model.startsWith("openai/gpt-oss-")) body.reasoning_effort = "low";
    if (jsonMode) body.response_format = { type: "json_object" };

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err: any = new Error(data?.error?.message || `Groq API error (${r.status}).`);
      err.status = r.status;
      err.model = model;
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") throw new Error("Groq returned no text.");
    return text;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error("Groq request timed out.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function isModelAvailabilityError(e: any) {
  const msg = e?.message || "";
  return e?.status === 404 || /model.*(not found|decommissioned|unavailable|does not exist)|invalid model/i.test(msg);
}

function parseJsonObject(text: string) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

function normalizeFeedback(v: any, language: string) {
  const list = (x: any) => Array.isArray(x) ? x.filter((y) => typeof y === "string" && y.trim()).slice(0, 5) : [];
  const str = (x: any) => typeof x === "string" ? x.slice(0, 4000) : "";
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(v?.score) || 0))),
    verdict: str(v?.verdict) || (language === "en" ? "Case review" : "Revisão do caso"),
    summary: str(v?.summary), strengths: list(v?.strengths), corrections: list(v?.corrections),
    error_reasons: list(v?.error_reasons), correct_reasoning: list(v?.correct_reasoning),
    ideal_answer: str(v?.ideal_answer), next_time: list(v?.next_time),
  };
}

function friendlyError(e: any) {
  const msg = e?.message || String(e || "Internal error.");
  if (/quota|rate limit|too many requests|429/i.test(msg)) return "Limite gratuito da IA atingido. Tente novamente mais tarde.";
  if (/api key|invalid.*key|unauthorized|401/i.test(msg)) return "A chave da IA está inválida ou sem permissão.";
  if (/timed out|timeout/i.test(msg)) return "A IA demorou mais que o esperado. Tente novamente.";
  return msg;
}

function errorStatus(e: any) {
  if (e?.status === 429 || /quota|rate limit|too many requests/i.test(e?.message || "")) return 429;
  if (e?.status === 401 || e?.status === 403) return e.status;
  return 500;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
