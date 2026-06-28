"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { AccessBadge } from "../components/AccessBadge";
import { LanguageToggle } from "../components/LanguageToggle";
import { translateLesionLabel, translateMedicalText, useLanguage } from "../i18n";

type AnalysisResult = {
  diagnosis: string;
  confidence: number;
  risk_level: string;
  recommendation: string;
  lesions: Array<{ label: string; confidence: number; bbox: number[]; demo_mode?: boolean }>;
  heatmap_path?: string;
  detection_path?: string;
  demo_mode?: boolean;
  classifier_demo_mode?: boolean;
  lesion_demo_mode?: boolean;
  disclaimer?: string;
  image_path?: string;
  report_id?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type PreviewImage = {
  src: string;
  title: string;
};

function backendAssetUrl(path: string | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${apiBase.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败。请改用 JPG/PNG，或把 iPhone 相机格式设为“兼容性最佳”。"));
    };
    image.src = url;
  });
}

async function compressImageForAnalysis(file: File) {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const image = await loadImageFromFile(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) return file;
  const originalName = file.name.replace(/\.[^.]+$/, "") || "fundus";
  return new File([blob], `${originalName}-compressed.jpg`, { type: "image/jpeg" });
}

export default function AIPage() {
  const { language, t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadHint, setUploadHint] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      setPreviewImage(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const heatmapUrl = useMemo(() => backendAssetUrl(result?.heatmap_path), [result]);
  const detectionUrl = useMemo(() => backendAssetUrl(result?.detection_path), [result]);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setUploadHint("");
    setResult(null);

    try {
      const uploadFile = await compressImageForAnalysis(file);
      if (uploadFile.size !== file.size) {
        setUploadHint(`已自动压缩上传 / Compressed for upload: ${Math.round(file.size / 1024)} KB → ${Math.round(uploadFile.size / 1024)} KB`);
      }
      const formData = new FormData();
      formData.append("file", uploadFile);
      const response = await fetch(`${apiBase}/analyze`, { method: "POST", body: formData });
      if (!response.ok) throw new Error(t.ai.requestFailed);
      const analysis = (await response.json()) as AnalysisResult;
      const originalImage = await readFileAsDataUrl(uploadFile);
      window.localStorage.setItem(
        "fundusx-latest-ai-report",
        JSON.stringify({
          result: analysis,
          originalImage,
          fileName: uploadFile.name,
          generatedAt: new Date().toISOString(),
          apiBase,
        })
      );
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.ai.unknownError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> {t.nav.home}</Link>
        <div className="navCluster"><AccessBadge /><LanguageToggle /></div>
      </div>
      <section className="workspace">
        <div className="uploadPanel">
          <h1>{t.ai.title}</h1>
          <p>{t.ai.intro}</p>
          <label className="dropzone">
            {previewUrl ? (
              <img className="uploadPreview" src={previewUrl} alt={file?.name || "fundus preview"} />
            ) : (
              <UploadCloud size={34} />
            )}
            <span>{file ? file.name : t.ai.chooseImage}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setResult(null);
                setUploadHint("");
                setError("");
              }}
            />
          </label>
          <button className="primaryButton" onClick={analyze} disabled={!file || loading}>
            {loading ? t.ai.analyzing : t.ai.run}
          </button>
          {uploadHint && <p className="success">{uploadHint}</p>}
          {error && <p className="error">{error}</p>}
        </div>

        <div className="resultPanel">
          <h2>{t.ai.result}</h2>
          {!result && (
            <div className="emptyResult">
              <ImageIcon size={30} />
              <p className="muted">{t.ai.waiting}</p>
              <p className="muted">{t.ai.apiHint}</p>
            </div>
          )}
          {result && (
            <div className="resultStack">
              {result.classifier_demo_mode && <div className="notice">{t.ai.demoMode}</div>}
              {!result.classifier_demo_mode && result.lesion_demo_mode && (
                <div className="notice">{t.ai.lesionDemoMode}</div>
              )}
              <p className="muted imageHint">{t.ai.imageZoomHint}</p>
              <div className="aiImageGrid">
                {previewUrl && (
                  <figure>
                    <button
                      className="imagePreviewButton"
                      type="button"
                      onClick={() => setPreviewImage({ src: previewUrl, title: `${t.ai.originalImage} / Original` })}
                    >
                      <img src={previewUrl} alt="uploaded fundus" />
                    </button>
                    <figcaption>{t.ai.originalImage} / Original</figcaption>
                  </figure>
                )}
                {heatmapUrl && (
                  <figure>
                    <button
                      className="imagePreviewButton"
                      type="button"
                      onClick={() => setPreviewImage({ src: heatmapUrl, title: `${t.ai.gradcamImage} / Grad-CAM` })}
                    >
                      <img src={heatmapUrl} alt="Grad-CAM heatmap" />
                    </button>
                    <figcaption>{t.ai.gradcamImage} / Grad-CAM</figcaption>
                  </figure>
                )}
                {detectionUrl && (
                  <figure>
                    <button
                      className="imagePreviewButton"
                      type="button"
                      onClick={() => setPreviewImage({ src: detectionUrl, title: `${t.ai.lesionDetectionImage} / Lesion detection` })}
                    >
                      <img src={detectionUrl} alt="lesion detection" />
                    </button>
                    <figcaption>{t.ai.lesionDetectionImage} / Lesion detection</figcaption>
                  </figure>
                )}
              </div>
              <div className="metricRow"><span>{t.ai.diagnosis}</span><strong>{translateMedicalText(result.diagnosis, language)}</strong></div>
              <div className="metricRow"><span>{t.ai.confidence}</span><strong>{result.confidence.toFixed(3)}</strong></div>
              <div className="metricRow"><span>{t.ai.riskLevel}</span><strong>{translateMedicalText(result.risk_level, language)}</strong></div>
              <div>
                <h3>{t.ai.lesions}</h3>
                <ul className="lesionList">
                  {result.lesions.map((lesion, index) => (
                    <li key={`${lesion.label}-${index}`}>
                      {translateLesionLabel(lesion.label, language)} · {lesion.confidence.toFixed(3)}
                      {lesion.demo_mode ? "（演示 / demo）" : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>{t.ai.recommendation}</h3>
                <p>{translateMedicalText(result.recommendation, language)}</p>
              </div>
              <Link className="primaryButton reportButton" href="/report">
                {t.ai.viewReport}
              </Link>
              <p className="muted">{translateMedicalText(result.disclaimer, language)}</p>
              {result.report_id && <p className="muted">报告编号 / Report ID: {result.report_id}</p>}
            </div>
          )}
        </div>
      </section>
      {previewImage && (
        <div className="imageModal" role="dialog" aria-modal="true">
          <div className="imageModalContent aiPreviewModal">
            <button className="modalClose" onClick={() => setPreviewImage(null)} aria-label={t.ai.closePreview}>
              <X size={20} />
            </button>
            <img src={previewImage.src} alt={previewImage.title} />
            <div className="modalInfo">
              <strong>{previewImage.title}</strong>
              <span>{t.ai.imageZoomHint}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
