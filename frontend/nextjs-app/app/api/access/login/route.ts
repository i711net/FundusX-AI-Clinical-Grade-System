import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

const USER_SESSION_COOKIE = "fundusx_user_session";
const ADMIN_SESSION_COOKIE = "fundusx_admin_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hashCode(code: string) {
  return createHash("sha256").update(code.trim(), "utf8").digest("hex");
}

async function sign(payloadPart: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function POST(request: NextRequest) {
  const sessionSecret = process.env.ACCESS_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) {
    return NextResponse.json({ error: "Access session secret is not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || body.accessCode || "").trim();
  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码 / Please enter username and password" }, { status: 400 });
  }

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && username === adminUsername && password === adminPassword) {
    const exp = Date.now() + THIRTY_DAYS_MS;
    const payloadPart = textToBase64Url(JSON.stringify({ role: "admin-user", mode: "admin", sid: randomUUID(), exp }));
    const signaturePart = await sign(payloadPart, sessionSecret);
    const response = NextResponse.json({ ok: true, expiresAt: new Date(exp).toISOString() });
    response.cookies.set(USER_SESSION_COOKIE, `${payloadPart}.${signaturePart}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor((exp - Date.now()) / 1000),
    });

    const adminSecret = process.env.ADMIN_SESSION_SECRET;
    if (adminSecret) {
      const adminPayloadPart = textToBase64Url(JSON.stringify({ role: "admin", exp }));
      const adminSignaturePart = await sign(adminPayloadPart, adminSecret);
      response.cookies.set(ADMIN_SESSION_COOKIE, `${adminPayloadPart}.${adminSignaturePart}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: Math.floor((exp - Date.now()) / 1000),
      });
    }
    return response;
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });
  }

  const codeHash = hashCode(`${username}:${password}`);
  const { data, error } = await supabase
    .from("subscription_accounts")
    .select("id,username,label,expires_at,max_uses,use_count,is_active")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const expiresAt = data?.expires_at ? new Date(data.expires_at).getTime() : 0;
  const isExpired = !expiresAt || expiresAt <= now;
  const usedUp = data?.max_uses !== null && data?.max_uses !== undefined && Number(data.use_count || 0) >= Number(data.max_uses);

  if (!data || !data.is_active || isExpired || usedUp) {
    return NextResponse.json({ error: "用户名或密码无效，或订阅已过期 / Invalid username or password, or subscription expired" }, { status: 401 });
  }

  await supabase
    .from("subscription_accounts")
    .update({ use_count: Number(data.use_count || 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  const exp = Math.min(expiresAt, now + THIRTY_DAYS_MS);
  const payloadPart = textToBase64Url(JSON.stringify({ role: "user", accountId: data.id, username: data.username, label: data.label, exp }));
  const signaturePart = await sign(payloadPart, sessionSecret);
  const response = NextResponse.json({ ok: true, expiresAt: new Date(expiresAt).toISOString(), label: data.label });

  response.cookies.set(USER_SESSION_COOKIE, `${payloadPart}.${signaturePart}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor((exp - now) / 1000),
  });

  return response;
}
