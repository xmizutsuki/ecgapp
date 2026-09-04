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

    if (mode === "case-feedback") return await handleCaseFeedback(body, language, apiKey);
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

  const context = sanitizeTutorContext(body?.context);
  const history = sanitizeHistory(body?.history);
  const socratic = body?.socratic_mode === true;

  // Exam Mode is intentionally enforced before any AI call.
  if (context?.activityType === "simulation" && context?.examMode === "exam") {
    return json({
      error: language === "en"
        ? "AI Tutor is locked until this Exam Mode practice exam is completed."
        : "O Tutor IA fica bloqueado até a finalização deste simulado em Modo Prova."
    }, 423);
  }

  const preAnswer = !!context && context.answerSubmitted === false;
  const instructions = language === "en"
    ? `You are CardioTutor, ECG Lab's EDUCATIONAL, contextual electrocardiography tutor.
Respond in clear international English and use a structured teaching style.
Teach a systematic method: rate, regularity, P wave, PR, QRS, axis when relevant, ST-T, and conclusion.
The context describes the learning screen that is already open. Use it naturally so the student does not need to restate the question, case, or ECG.
IMPORTANT LEARNING RULE: when context.answerSubmitted is false, NEVER reveal the correct option, diagnosis, reference answer, or a statement that effectively gives the answer. Do not infer a hidden answer from metadata. Give hints, ask the student to inspect specific ECG features, and help them reason step by step. After answerSubmitted becomes true, you may explain the correct answer, why alternatives are wrong, and the educational reasoning.
${socratic ? "SOCRATIC MODE IS ON: prefer one focused question at a time, wait for the learner's reasoning, and avoid immediately giving conclusions even after submission unless needed to correct a misconception." : "Socratic mode is off: you may explain directly while still protecting unanswered questions."}
When the learner explains reasoning, organize feedback around: what was identified correctly, what needs correction, what was missed, how to reach the conclusion, and one key point to remember.
Use performanceMemory only as gentle background context. Tutor use is not evidence of weakness by itself.
The ECG Lab tracings are synthetic educational reconstructions. Do not claim they are real-patient ECGs.
Do not diagnose real-patient ECGs, replace clinical assessment, or provide individualized emergency management. If real-patient data are supplied, redirect to general educational principles.
Be concise but show the reasoning.`
    : `Você é o CardioTutor do ECG Lab, um tutor EDUCACIONAL e contextual de eletrocardiografia.
Responda em português brasileiro, de forma didática e estruturada.
Ensine um método sistemático: frequência, regularidade, onda P, PR, QRS, eixo quando pertinente, ST-T e conclusão.
O contexto descreve a tela educacional que já está aberta. Use-o naturalmente para que o estudante não precise repetir a questão, o caso ou o ECG.
REGRA EDUCACIONAL IMPORTANTE: quando context.answerSubmitted for false, NUNCA revele a alternativa correta, o diagnóstico, a resposta de referência ou uma frase que entregue efetivamente a resposta. Não infira uma resposta escondida a partir de metadados. Dê dicas, peça ao estudante para observar características específicas do ECG e conduza o raciocínio passo a passo. Depois que answerSubmitted for true, você poderá explicar a resposta correta, por que as alternativas estão erradas e o raciocínio educacional completo.
${socratic ? "MODO SOCRÁTICO ATIVADO: prefira uma pergunta focada por vez, aguarde o raciocínio do aluno e evite entregar conclusões imediatamente, mesmo após a tentativa, salvo quando necessário para corrigir um conceito." : "Modo Socrático desativado: você pode explicar de forma mais direta, mantendo a proteção das questões ainda não respondidas."}
Quando o aluno explicar o raciocínio, organize o feedback em: o que identificou corretamente, o que precisa ser corrigido, o que deixou de observar, como chegar à conclusão e um ponto-chave para lembrar.
Use performanceMemory apenas como contexto pedagógico leve. O uso do Tutor, isoladamente, não é sinal de fraqueza.
Os traçados do ECG Lab são reconstruções educacionais sintéticas. Não afirme que são ECGs reais de pacientes.
Não diagnostique ECGs reais de pacientes, não substitua avaliação clínica e não dê conduta individualizada de emergência. Se forem fornecidos dados de paciente real, redirecione para princípios educacionais gerais.
Seja conciso, mas explique o raciocínio.`;

  const input = JSON.stringify({
    learner_message: message,
    context,
    conversation_history: history,
    learning_state: preAnswer ? "pre-answer" : "post-answer-or-general",
    socratic_mode: socratic,
  });

  const data = await openAI(apiKey, instructions, input, 900);
  const reply = extractText(data) || (language === "en"
    ? "I could not generate a response right now."
    : "Não consegui gerar uma resposta agora.");
  return json({ reply }, 200);
}

function sanitizeTutorContext(value: any) {
  if (!value || typeof value !== "object") return null;
  const allowed = [
    "language", "currentModule", "activityType", "activityId", "questionId", "questionText",
    "alternatives", "selectedAnswer", "answerSubmitted", "correctAnswer", "explanation", "ecgData",
    "caseData", "lesson", "topic", "category", "difficulty", "sessionProgress", "examMode", "label",
    "performanceMemory"
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (value[key] !== undefined) out[key] = value[key];

  // Defense in depth: hidden answers must not enter the model context before a learner attempt.
  if (out.answerSubmitted === false) {
    delete out.correctAnswer;
    delete out.explanation;
  }
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

  const input = JSON.stringify({ student_answer: answer, case: sanitizeCase(c) });
  const data = await openAI(apiKey, instructions, input, 1200);
  const raw = extractText(data);
  const parsed = parseJsonObject(raw);
  if (!parsed) return json({ error: language === "en" ? "AI returned an invalid feedback format." : "A IA retornou um formato de feedback inválido." }, 502);
  return json({ feedback: normalizeFeedback(parsed, language) }, 200);
}

function sanitizeCase(c: any) {
  const allowed = [
    "title", "chief_complaint", "anamnesis", "medications", "vitals", "physical_exam",
    "labs", "imaging", "question", "expected_answer", "reference_reasoning", "trap", "learning_point",
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (c?.[key] !== undefined) out[key] = c[key];
  return out;
}

async function openAI(apiKey: string, instructions: string, input: string, maxOutputTokens: number) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

function normalizeFeedback(v: any, language: string) {
  const list = (x: any) => Array.isArray(x) ? x.filter((y) => typeof y === "string" && y.trim()).slice(0, 5) : [];
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
  for (const item of out) for (const c of item?.content || []) if (c?.type === "output_text" && c?.text) chunks.push(c.text);
  return chunks.join("\n");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
