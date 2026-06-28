import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

function hashCode(code: string) {
  return createHash("sha256").update(code.trim(), "utf8").digest("hex");
}

function generateCode() {
  return `FX-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function GET() {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("access_codes")
    .select("id,label,expires_at,max_uses,use_count,is_active,last_used_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accessCodes: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim() || generateCode();
  const label = String(body.label || "").trim() || "Monthly access";
  const days = Math.max(1, Number(body.days || 30));
  const maxUses = body.maxUses === "" || body.maxUses === null || body.maxUses === undefined ? null : Math.max(1, Number(body.maxUses));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("access_codes")
    .insert({
      code_hash: hashCode(code),
      label,
      expires_at: expiresAt,
      max_uses: maxUses,
      is_active: true,
    })
    .select("id,label,expires_at,max_uses,use_count,is_active,last_used_at,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accessCode: data, code });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("access_codes")
    .update({ is_active: Boolean(body.isActive) })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
