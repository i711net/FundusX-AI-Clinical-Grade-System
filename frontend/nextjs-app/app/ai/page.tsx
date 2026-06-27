"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, UploadCloud } from "lucide-react";
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
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function AIPage() {
  const { language, t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
            <UploadCloud size={34} />
            <span>{file ? file.name : t.ai.chooseImage}</span>
            <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button className="primaryButton" onClick={analyze} disabled={!file || loading}>
            {loading ? t.ai.analyzing : t.ai.run}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="resultPanel">
          <h2>{t.ai.result}</h2>
          {!result && <p className="muted">{t.ai.waiting}</p>}
          {result && (
            <div className="resultStack">
              {result.demo_mode && <div className="notice">{t.ai.demoMode}</div>}
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
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
