import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

const USER_SESSION_COOKIE = "fundusx_user_session";
const ADMIN_SESSION_COOKIE = "fundusx_admin_session";

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

async function verifySession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return null;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(payloadPart)
  );
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as {
    role?: string;
    username?: string;
    label?: string;
    accountId?: string;
    sessionId?: string;
    exp?: number;
  };
  if (!payload.exp || payload.exp <= Date.now()) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  const userPayload = await verifySession(
    request.cookies.get(USER_SESSION_COOKIE)?.value,
    process.env.ACCESS_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  );
  if (userPayload) {
    if (!userPayload.role?.includes("admin") && userPayload.accountId && userPayload.sessionId) {
      const supabase = createServerSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("subscription_accounts")
          .select("active_session_id,is_active,expires_at,active_session_started_at")
          .eq("id", userPayload.accountId)
          .maybeSingle();
        if (!data || !data.is_active || new Date(data.expires_at).getTime() <= Date.now() || data.active_session_id !== userPayload.sessionId) {
          return NextResponse.json({ authenticated: false, reason: "session_replaced" }, { status: 401 });
        }
      }
    }
    return NextResponse.json({
      authenticated: true,
      role: userPayload.role || "user",
      username: userPayload.username || "",
      label: userPayload.label || "",
      expiresAt: new Date(userPayload.exp || Date.now()).toISOString(),
      remainingDays: Math.max(0, Math.ceil(((userPayload.exp || 0) - Date.now()) / (24 * 60 * 60 * 1000))),
    });
  }

  const adminPayload = await verifySession(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET
  );
  if (adminPayload) {
    return NextResponse.json({
      authenticated: true,
      role: "admin",
      username: "admin",
      label: "Admin",
      expiresAt: new Date(adminPayload.exp || Date.now()).toISOString(),
      remainingDays: Math.max(0, Math.ceil(((adminPayload.exp || 0) - Date.now()) / (24 * 60 * 60 * 1000))),
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
