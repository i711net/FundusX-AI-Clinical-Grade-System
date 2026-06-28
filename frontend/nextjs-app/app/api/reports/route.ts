import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../lib/serverSupabase";

export const runtime = "nodejs";

function normalizeUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("data:")) return null;
  return text;
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const result = body.result || {};
  const diagnosis = String(result.diagnosis || "").trim();

  if (!diagnosis) {
    return NextResponse.json({ error: "Missing diagnosis" }, { status: 400 });
  }

  const apiBase = String(body.apiBase || "").replace(/\/$/, "");
  const heatmapPath = String(result.heatmap_path || "");
  const detectionPath = String(result.detection_path || "");
  const toAssetUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return apiBase ? `${apiBase}/${path.replace(/^\/+/, "")}` : path;
  };

  const { data, error } = await supabase
    .from("ai_reports")
    .insert({
      image_url: normalizeUrl(body.imageUrl),
      diagnosis,
      confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : null,
      lesions: Array.isArray(result.lesions) ? result.lesions : [],
      heatmap_url: toAssetUrl(heatmapPath),
      detection_url: toAssetUrl(detectionPath),
      risk_level: String(result.risk_level || "").trim() || null,
      recommendation: String(result.recommendation || "").trim() || null,
    })
    .select("id,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
