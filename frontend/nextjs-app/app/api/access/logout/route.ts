import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

function readPayload(token: string | undefined) {
  if (!token) return null;
  const [payloadPart] = token.split(".");
  if (!payloadPart) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as { accountId?: string };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const payload = readPayload(request.cookies.get("fundusx_user_session")?.value);
  if (payload?.accountId) {
    const supabase = createServerSupabase();
    await supabase
      ?.from("subscription_accounts")
      .update({ active_session_id: null, active_session_started_at: null })
      .eq("id", payload.accountId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("fundusx_user_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
