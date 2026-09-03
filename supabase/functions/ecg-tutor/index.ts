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
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "User not authenticated." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase environment is not configured." }, 500);

    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: anonKey },
    });
    if (!userCheck.ok) return json({ error: "Invalid session." }, 401);

    const body = await req.json();
    const message = body?.message;
    const language = body?.language === "en" ? "en" : "pt-BR";
    if (!message || typeof message !== "string" || message.length > 3000) {
      return json({ error: language === "en" ? "Invalid message." : "Mensagem inválida." }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

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

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna",
        instructions,
        input: message,
        max_output_tokens: 700,
      }),
    });

    const data = await r.json();
    if (!r.ok) return json({ error: data?.error?.message || "AI service error." }, r.status);

    const reply = extractText(data) || (language === "en" ? "I could not generate a response right now." : "Não consegui gerar uma resposta agora.");
    return json({ reply }, 200);
  } catch (e) {
    return json({ error: e?.message || "Internal error." }, 500);
  }
});

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
