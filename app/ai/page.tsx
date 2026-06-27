"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Image as ImageIcon, UploadCloud } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";
import { translateMedicalText, useLanguage } from "../i18n";

type AnalysisResult = {
  diagnosis: string;
  confidence: number;
  risk_level: string;
  recommendation: string;
  lesions: Array<{ label: string; confidence: number; bbox: number[] }>;
  heatmap_path?: string;
  detection_path?: string;
  demo_mode?: boolean;
  disclaimer?: string;
  image_path?: string;
  report_id?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function backendAssetUrl(path: string | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${apiBase.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}

export default function AIPage() {
  const { language, t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
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
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${apiBase}/analyze`, { method: "POST", body: formData });
      if (!response.ok) throw new Error(t.ai.requestFailed);
      setResult(await response.json());
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
        <LanguageToggle />
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
                setError("");
              }}
            />
          </label>
          <button className="primaryButton" onClick={analyze} disabled={!file || loading}>
            {loading ? t.ai.analyzing : t.ai.run}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="resultPanel">
          <h2>{t.ai.result}</h2>
          {!result && (
            <div className="emptyResult">
              <ImageIcon size={30} />
              <p className="muted">{t.ai.waiting}</p>
              <p className="muted">如果点击后没有结果，请检查 Vercel 环境变量 NEXT_PUBLIC_API_BASE_URL 是否指向正在运行的 Python API。</p>
            </div>
          )}
          {result && (
            <div className="resultStack">
              {result.demo_mode && <div className="notice">{t.ai.demoMode}</div>}
              <div className="aiImageGrid">
                {previewUrl && (
                  <figure>
                    <img src={previewUrl} alt="uploaded fundus" />
                    <figcaption>原图 / Original</figcaption>
                  </figure>
                )}
                {heatmapUrl && (
                  <figure>
                    <img src={heatmapUrl} alt="Grad-CAM heatmap" />
                    <figcaption>热力图 / Grad-CAM</figcaption>
                  </figure>
                )}
                {detectionUrl && (
                  <figure>
                    <img src={detectionUrl} alt="lesion detection" />
                    <figcaption>病灶检测 / Lesion detection</figcaption>
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
                    <li key={`${lesion.label}-${index}`}>{lesion.label} · {lesion.confidence.toFixed(3)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>{t.ai.recommendation}</h3>
                <p>{translateMedicalText(result.recommendation, language)}</p>
              </div>
              <p className="muted">{translateMedicalText(result.disclaimer, language)}</p>
              {result.report_id && <p className="muted">报告编号 / Report ID: {result.report_id}</p>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
