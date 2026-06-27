import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!publicBaseUrl) return "";
  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "fundus-images/uploads");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const accountId = requiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
    const bucket = requiredEnv("R2_BUCKET_NAME");

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const safeFolder = folder.replace(/^\/+|\/+$/g, "");
    const key = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

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
