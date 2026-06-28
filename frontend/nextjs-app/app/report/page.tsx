"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Database, Download, FileText, Printer, Share2 } from "lucide-react";
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

type SaveFilePickerWindow = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

function assetUrl(path: string | undefined, apiBase: string | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${(apiBase || "").replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}

function reportFileName(generatedAt: string | undefined) {
  const date = generatedAt ? new Date(generatedAt) : new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
  return `FundusX-AI-report-${stamp}.pdf`;
}

export default function ReportPage() {
  const { language, t } = useLanguage();
  const [report, setReport] = useState<StoredReport | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [savingArchive, setSavingArchive] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfMessage, setPdfMessage] = useState("");
  const [archiveMessage, setArchiveMessage] = useState("");
  const reportRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!report) return;
    const timer = window.setTimeout(() => {
      preparePdf();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [report, language]);

  async function waitForImages(container: HTMLElement) {
    const images = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }
            image.onload = () => resolve();
            image.onerror = () => resolve();
          })
      )
    );
  }

  async function createPdfBlob() {
    if (!reportRef.current || !report) return null;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    await waitForImages(reportRef.current);
    await document.fonts?.ready;
    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      ignoreElements: (element) => element.hasAttribute("data-html2canvas-ignore"),
    });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * usableWidth) / canvas.width;
    let remainingHeight = imageHeight;
    let y = margin;

    const imageData = canvas.toDataURL("image/png");
    pdf.addImage(imageData, "PNG", margin, y, usableWidth, imageHeight);
    remainingHeight -= pageHeight - margin * 2;

    while (remainingHeight > 0) {
      pdf.addPage();
      y = margin - (imageHeight - remainingHeight);
      pdf.addImage(imageData, "PNG", margin, y, usableWidth, imageHeight);
      remainingHeight -= pageHeight - margin * 2;
    }

    return pdf.output("blob");
  }

  async function preparePdf() {
    if (!report) return null;
    setPreparing(true);
    setPdfMessage(t.report.preparingPdf);
    try {
      const blob = await createPdfBlob();
      setPdfBlob(blob);
      setPdfMessage(blob ? t.report.pdfReady : t.report.pdfFailed);
      return blob;
    } catch (error) {
      console.error(error);
      setPdfBlob(null);
      setPdfMessage(t.report.pdfFailed);
      return null;
    } finally {
      setPreparing(false);
    }
  }

  async function saveBlob(blob: Blob, fileName: string) {
    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: fileName,
          types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    if (!report) return;
    setDownloading(true);
    try {
      const blob = pdfBlob || await preparePdf();
      if (blob) await saveBlob(blob, reportFileName(report.generatedAt));
    } finally {
      setDownloading(false);
    }
  }

  async function sharePdf() {
    if (!report) return;
    setSharing(true);
    try {
      const blob = pdfBlob || await preparePdf();
      if (!blob) return;
      const fileName = reportFileName(report.generatedAt);
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: t.report.title,
          text: t.report.sourceValue,
          files: [file],
        });
      } else {
        await saveBlob(blob, fileName);
      }
    } catch (error) {
      console.error(error);
      setPdfMessage(t.report.pdfFailed);
    } finally {
      setSharing(false);
    }
  }

  async function saveToArchive() {
    if (!report) return;
    setSavingArchive(true);
    setArchiveMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: report.result,
          apiBase: report.apiBase,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "保存失败 / Save failed");
      setArchiveMessage(`已保存到后台档案 / Saved to admin archive: ${data.report?.id || ""}`);
    } catch (error) {
      setArchiveMessage(error instanceof Error ? error.message : "保存失败 / Save failed");
    } finally {
      setSavingArchive(false);
    }
  }

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> {t.nav.home}</Link>
        <div className="navCluster"><AccessBadge /><LanguageToggle /></div>
      </div>
      <section className="report" ref={reportRef}>
        <div className="reportHeader">
          <FileText size={26} />
          <div>
            <h1>{t.report.title}</h1>
            <p>{report ? t.report.sourceValue : t.report.intro}</p>
          </div>
          {report && (
            <div className="reportActions" data-html2canvas-ignore="true">
              <button className="secondaryButton reportPrintButton" type="button" onClick={downloadPdf} disabled={downloading}>
                <Download size={17} /> {downloading ? t.report.downloadingPdf : t.report.downloadPdf}
              </button>
              <button className="secondaryButton reportPrintButton" type="button" onClick={sharePdf} disabled={sharing || preparing}>
                <Share2 size={17} /> {sharing ? t.report.sharingPdf : t.report.sharePdf}
              </button>
              <button className="secondaryButton reportPrintButton" type="button" onClick={saveToArchive} disabled={savingArchive}>
                <Database size={17} /> {savingArchive ? "保存中 / Saving" : "保存档案 / Archive"}
              </button>
              <button className="secondaryButton reportPrintButton" type="button" onClick={() => window.print()}>
                <Printer size={17} /> {t.report.print}
              </button>
            </div>
          )}
        </div>
        {report && pdfMessage && (
          <p className={`pdfStatus ${pdfBlob ? "ready" : ""}`} data-html2canvas-ignore="true">
            {pdfMessage}
          </p>
        )}
        {report && archiveMessage && (
          <p className={`pdfStatus ${archiveMessage.includes("已保存") ? "ready" : ""}`} data-html2canvas-ignore="true">
            {archiveMessage}
          </p>
        )}

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
                  <img src={heatmapUrl} alt="Grad-CAM heatmap" crossOrigin="anonymous" />
                  <figcaption>{t.report.heatmap} / Grad-CAM</figcaption>
                </figure>
              )}
              {detectionUrl && (
                <figure>
                  <img src={detectionUrl} alt="Lesion detection" crossOrigin="anonymous" />
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
