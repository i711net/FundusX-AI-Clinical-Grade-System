import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

const SESSION_COOKIE = "fundusx_user_session";
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
  const accessCode = String(body.accessCode || "").trim();
  if (!accessCode) {
    return NextResponse.json({ error: "请输入访问码 / Please enter an access code" }, { status: 400 });
  }

  const simplePassword = process.env.USER_ACCESS_PASSWORD;
  if (simplePassword && accessCode === simplePassword) {
    const exp = Date.now() + THIRTY_DAYS_MS;
    const payloadPart = textToBase64Url(JSON.stringify({ role: "user", mode: "password", sid: randomUUID(), exp }));
    const signaturePart = await sign(payloadPart, sessionSecret);
    const response = NextResponse.json({ ok: true, expiresAt: new Date(exp).toISOString() });
    response.cookies.set(SESSION_COOKIE, `${payloadPart}.${signaturePart}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor((exp - Date.now()) / 1000),
    });
    return response;
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });
  }

  const codeHash = hashCode(accessCode);
  const { data, error } = await supabase
    .from("access_codes")
    .select("id,label,expires_at,max_uses,use_count,is_active")
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
    return NextResponse.json({ error: "访问码无效或已过期 / Access code is invalid or expired" }, { status: 401 });
  }

  await supabase
    .from("access_codes")
    .update({ use_count: Number(data.use_count || 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  const exp = Math.min(expiresAt, now + THIRTY_DAYS_MS);
  const payloadPart = textToBase64Url(JSON.stringify({ role: "user", accessCodeId: data.id, label: data.label, exp }));
  const signaturePart = await sign(payloadPart, sessionSecret);
  const response = NextResponse.json({ ok: true, expiresAt: new Date(expiresAt).toISOString(), label: data.label });

  response.cookies.set(SESSION_COOKIE, `${payloadPart}.${signaturePart}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor((exp - now) / 1000),
  });

  return response;
}
