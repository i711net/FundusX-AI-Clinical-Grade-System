import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get("page") || 0));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 50)));
  const search = String(searchParams.get("search") || "").trim().replace(/[%(),]/g, "");
  const risk = String(searchParams.get("risk") || "").trim();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("ai_reports")
    .select("id,fundus_image_id,image_url,diagnosis,confidence,lesions,heatmap_url,detection_url,risk_level,recommendation,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`diagnosis.ilike.%${search}%,risk_level.ilike.%${search}%,recommendation.ilike.%${search}%`);
  }
  if (risk) query = query.eq("risk_level", risk);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data || [], count: count || 0 });
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

  const { error } = await supabase.from("ai_reports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
