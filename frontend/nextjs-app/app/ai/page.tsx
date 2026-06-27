"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, UploadCloud } from "lucide-react";

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
      if (!response.ok) throw new Error("Analysis request failed");
      setResult(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell compact">
      <Link className="backLink" href="/"><ArrowLeft size={18} /> Home</Link>
      <section className="workspace">
        <div className="uploadPanel">
          <h1>AI Detection</h1>
          <p>Upload one retinal fundus image. The API returns diagnosis, lesion candidates, heatmap path, risk level, and recommendation.</p>
          <label className="dropzone">
            <UploadCloud size={34} />
            <span>{file ? file.name : "Choose fundus image"}</span>
            <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button className="primaryButton" onClick={analyze} disabled={!file || loading}>
            {loading ? "Analyzing..." : "Run AI Analysis"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="resultPanel">
          <h2>Result</h2>
          {!result && <p className="muted">The structured report will appear here after analysis.</p>}
          {result && (
            <div className="resultStack">
              {result.demo_mode && <div className="notice">Demo mode: trained weights were not found.</div>}
              <div className="metricRow"><span>Diagnosis</span><strong>{result.diagnosis}</strong></div>
              <div className="metricRow"><span>Confidence</span><strong>{result.confidence.toFixed(3)}</strong></div>
              <div className="metricRow"><span>Risk level</span><strong>{result.risk_level}</strong></div>
              <div>
                <h3>Lesions</h3>
                <ul className="lesionList">
                  {result.lesions.map((lesion, index) => (
                    <li key={`${lesion.label}-${index}`}>{lesion.label} · {lesion.confidence.toFixed(3)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Recommendation</h3>
                <p>{result.recommendation}</p>
              </div>
              <p className="muted">{result.disclaimer}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
