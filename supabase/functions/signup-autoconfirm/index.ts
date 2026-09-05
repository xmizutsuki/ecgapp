// ECG Lab — account signup with immediate email confirmation.
//
// This function is intentionally public at the Edge gateway (verify_jwt=false)
// because it is the signup entry point. It performs strict origin/input checks,
// server-side rate limiting, and uses the Supabase service role only inside the
// Edge Function. No admin key is ever returned to or embedded in the browser.

import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const APP_ORIGIN = "https://xmizutsuki.github.io";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, cors);
  if (!originAllowed(origin)) return json({ error: "Origin not allowed." }, 403, cors);

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 12000) {
    return json({ error: "Request payload is too large." }, 413, cors);
  }

  try {
    const body = await req.json().catch(() => null);
    const language = body?.language === "en" ? "en" : "pt-BR";
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    const fullName = normalizeName(body?.full_name);

    if (!email || !isValidEmail(email)) {
      return json({ error: language === "en" ? "Enter a valid email address." : "Informe um e-mail válido." }, 400, cors);
    }
    if (password.length < 6 || password.length > 128) {
      return json({ error: language === "en" ? "Password must contain 6 to 128 characters." : "A senha deve ter entre 6 e 128 caracteres." }, 400, cors);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("signup-autoconfirm: missing Supabase server environment");
      return json({ error: language === "en" ? "Account service is temporarily unavailable." : "O serviço de contas está temporariamente indisponível." }, 503, cors);
    }

    const allowed = await consumeSignupQuota(req, email, supabaseUrl, serviceRoleKey);
    if (!allowed) {
      return json({ error: language === "en" ? "Too many account creation attempts. Wait a little and try again." : "Muitas tentativas de criação de conta. Aguarde um pouco e tente novamente." }, 429, cors, { "Retry-After": "60" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      console.error("signup-autoconfirm createUser failed", error.message);
      const duplicate = /already|registered|exists|duplicate/i.test(error.message || "");
      return json({
        error: duplicate
          ? (language === "en" ? "Could not create the account. If this email is already registered, try signing in." : "Não foi possível criar a conta. Se este e-mail já estiver cadastrado, tente entrar.")
          : (language === "en" ? "Could not create the account. Please try again." : "Não foi possível criar a conta. Tente novamente."),
      }, duplicate ? 409 : 400, cors);
    }

    return json({ ok: true }, 200, cors);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("signup-autoconfirm unexpected error", message);
    return json({ error: "Não foi possível criar a conta agora. Tente novamente." }, 500, cors);
  }
});

function originAllowed(origin: string | null) {
  if (!origin) return true;
  if (origin === APP_ORIGIN) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function corsHeaders(origin: string | null) {
  const allowOrigin = originAllowed(origin) && origin ? origin : APP_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 100);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function consumeSignupQuota(req: Request, email: string, supabaseUrl: string, serviceRoleKey: string) {
  const forwarded = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
  const ua = (req.headers.get("user-agent") || "unknown").slice(0, 180);
  const networkKey = await sha256(`signup-network:${forwarded}|ua:${ua}`);
  const emailKey = await sha256(`signup-email:${email}`);

  const burst = await consumeQuotaRpc(supabaseUrl, serviceRoleKey, `${networkKey}:burst`, 2, 60);
  if (!burst) return false;
  const hourly = await consumeQuotaRpc(supabaseUrl, serviceRoleKey, `${networkKey}:hour`, 8, 3600);
  if (!hourly) return false;
  return await consumeQuotaRpc(supabaseUrl, serviceRoleKey, `${emailKey}:hour`, 4, 3600);
}

async function consumeQuotaRpc(supabaseUrl: string, serviceRoleKey: string, key: string, limit: number, windowSeconds: number) {
  const r = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_ai_quota`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
  });
  if (!r.ok) throw new Error("Signup rate limiter unavailable.");
  return (await r.json().catch(() => false)) === true;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status: number, cors: Record<string, string>, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
