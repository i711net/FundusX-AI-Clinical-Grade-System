import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../lib/serverSupabase";

export const runtime = "nodejs";

function normalizeUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("data:")) return null;
  return text;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function buildPublicUrl(key: string) {
  return `${requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "")}/${key}`;
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 500 });

  const contentType = request.headers.get("content-type") || "";
  let body: Record<string, unknown> = {};
  let pdfUrl: string | null = null;
  let pdfStorageKey: string | null = null;
  let pdfSizeBytes: number | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    body = JSON.parse(String(formData.get("payload") || "{}")) as Record<string, unknown>;
    const pdf = formData.get("pdf");
    if (pdf instanceof File) {
      const key = `ai-reports/pdf/${Date.now()}-${crypto.randomUUID()}.pdf`;
      const buffer = Buffer.from(await pdf.arrayBuffer());
      await createR2Client().send(
        new PutObjectCommand({
          Bucket: requiredEnv("R2_BUCKET_NAME"),
          Key: key,
          Body: buffer,
          ContentType: "application/pdf",
          CacheControl: "private, max-age=0",
        })
      );
      pdfStorageKey = key;
      pdfUrl = buildPublicUrl(key);
      pdfSizeBytes = buffer.byteLength;
    }
  } else {
    body = await request.json().catch(() => ({}));
  }

  const result = (body.result || {}) as Record<string, unknown>;
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
      pdf_url: pdfUrl,
      pdf_storage_key: pdfStorageKey,
      pdf_size_bytes: pdfSizeBytes,
      risk_level: String(result.risk_level || "").trim() || null,
      recommendation: String(result.recommendation || "").trim() || null,
    })
    .select("id,created_at,pdf_url,pdf_size_bytes")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
