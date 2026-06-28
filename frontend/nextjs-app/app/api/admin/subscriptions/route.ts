import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

function hashCredential(username: string, code: string) {
  return createHash("sha256").update(`${username.trim()}:${code.trim()}`, "utf8").digest("hex");
}

function generateCode() {
  return `FX-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function GET() {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("subscription_accounts")
    .select("id,username,label,expires_at,max_uses,use_count,is_active,active_session_id,active_session_started_at,last_used_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const code = String(body.code || "").trim() || generateCode();
  const label = String(body.label || "").trim() || username;
  const days = Math.max(1, Number(body.days || 30));
  const maxUses = body.maxUses === "" || body.maxUses === null || body.maxUses === undefined ? null : Math.max(1, Number(body.maxUses));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("subscription_accounts")
    .upsert(
      {
        username,
        code_hash: hashCredential(username, code),
        label,
        expires_at: expiresAt,
        max_uses: maxUses,
        use_count: 0,
        is_active: true,
      },
      { onConflict: "username" }
    )
    .select("id,username,label,expires_at,max_uses,use_count,is_active,active_session_id,active_session_started_at,last_used_at,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data, code });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payload: Record<string, unknown> = {};
  if ("isActive" in body) payload.is_active = Boolean(body.isActive);
  if ("days" in body) payload.expires_at = new Date(Date.now() + Math.max(1, Number(body.days || 30)) * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("subscription_accounts").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const deletePassword = String(body.deletePassword || "");
  const configuredDeletePassword = process.env.ADMIN_DELETE_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!configuredDeletePassword || deletePassword !== configuredDeletePassword) {
    return NextResponse.json({ error: "删除密码错误 / Invalid delete password" }, { status: 403 });
  }

  const { error } = await supabase.from("subscription_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
