import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function buildPublicUrl(key: string) {
  const publicBaseUrl = requiredEnv("R2_PUBLIC_BASE_URL");
  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

function createR2Client() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "fundus-images/uploads");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bucket = requiredEnv("R2_BUCKET_NAME");

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const safeFolder = folder.replace(/^\/+|\/+$/g, "");
    const key = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const client = createR2Client();

    const body = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return NextResponse.json({
      key,
      bucket,
      url: buildPublicUrl(key),
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: "Missing R2 object key" }, { status: 400 });
    }

    const client = createR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: requiredEnv("R2_BUCKET_NAME"),
        Key: key,
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
