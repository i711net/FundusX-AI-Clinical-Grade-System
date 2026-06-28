"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Printer } from "lucide-react";
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
  disclaimer?: string;
  report_id?: string;
};

type StoredReport = {
  result: AnalysisResult;
  originalImage?: string;
  fileName?: string;
  generatedAt?: string;
  apiBase?: string;
};

function assetUrl(path: string | undefined, apiBase: string | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${(apiBase || "").replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}

export default function ReportPage() {
  const { language, t } = useLanguage();
  const [report, setReport] = useState<StoredReport | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("fundusx-latest-ai-report");
    if (!raw) return;
    try {
      setReport(JSON.parse(raw) as StoredReport);
    } catch {
      setReport(null);
    }
  }, []);

  const heatmapUrl = useMemo(
    () => assetUrl(report?.result.heatmap_path, report?.apiBase),
    [report]
  );
  const detectionUrl = useMemo(
    () => assetUrl(report?.result.detection_path, report?.apiBase),
    [report]
  );

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> {t.nav.home}</Link>
        <LanguageToggle />
      </div>
      <section className="report">
        <div className="reportHeader">
          <FileText size={26} />
          <div>
            <h1>{t.report.title}</h1>
            <p>{report ? t.report.sourceValue : t.report.intro}</p>
          </div>
          {report && (
            <button className="secondaryButton reportPrintButton" type="button" onClick={() => window.print()}>
              <Printer size={17} /> {t.report.print}
            </button>
          )}
        </div>

        {!report && (
          <div className="emptyResult reportEmpty">
            <FileText size={30} />
            <p className="muted">{t.report.noReport}</p>
            <Link className="primaryButton" href="/ai">{t.report.backToAi}</Link>
          </div>
        )}

        {report && (
          <div className="reportBody">
            <div className="reportMeta">
              <span>{t.report.source}: {report.fileName || t.report.sourceValue}</span>
              {report.generatedAt && <span>{t.report.generatedAt}: {new Date(report.generatedAt).toLocaleString()}</span>}
              {report.result.report_id && <span>{t.report.reportId}: {report.result.report_id}</span>}
            </div>

            <div className="metricRow">
              <span>{t.report.diagnosis}</span>
              <strong>{translateMedicalText(report.result.diagnosis, language)}</strong>
            </div>
            <div className="metricRow">
              <span>{t.report.confidence}</span>
              <strong>{report.result.confidence.toFixed(3)}</strong>
            </div>
            <div className="metricRow">
              <span>{t.report.riskLevel}</span>
              <strong>{translateMedicalText(report.result.risk_level, language)}</strong>
            </div>

            <div className="reportImageGrid">
              {report.originalImage && (
                <figure>
                  <img src={report.originalImage} alt="Original fundus" />
                  <figcaption>{t.ai.originalImage} / Original</figcaption>
                </figure>
              )}
              {heatmapUrl && (
                <figure>
                  <img src={heatmapUrl} alt="Grad-CAM heatmap" />
                  <figcaption>{t.report.heatmap} / Grad-CAM</figcaption>
                </figure>
              )}
              {detectionUrl && (
                <figure>
                  <img src={detectionUrl} alt="Lesion detection" />
                  <figcaption>{t.report.detectionImage} / Lesion detection</figcaption>
                </figure>
              )}
            </div>

            <h2>{t.report.lesions}</h2>
            <ul className="lesionList reportLesions">
              {report.result.lesions.map((lesion, index) => (
                <li key={`${lesion.label}-${index}`}>
                  {translateLesionLabel(lesion.label, language)} · {lesion.confidence.toFixed(3)}
                  {lesion.demo_mode ? "（演示 / demo）" : ""}
                </li>
              ))}
            </ul>

            <h2>{t.report.recommendation}</h2>
            <p>{translateMedicalText(report.result.recommendation, language)}</p>
            <h2>{t.report.disclaimerTitle}</h2>
            <p>{translateMedicalText(report.result.disclaimer, language) || t.report.disclaimer}</p>
          </div>
        )}
      </section>
    </main>
  );
}
