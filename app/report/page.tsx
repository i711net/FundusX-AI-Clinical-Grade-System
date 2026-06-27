"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../i18n";

export default function ReportPage() {
  const { t } = useLanguage();

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
            <p>{t.report.intro}</p>
          </div>
        </div>
        <div className="reportBody">
          <div className="metricRow"><span>{t.report.diagnosis}</span><strong>{t.report.diagnosisValue}</strong></div>
          <div className="metricRow"><span>{t.report.confidence}</span><strong>0.930</strong></div>
          <div className="metricRow"><span>{t.report.lesionEvidence}</span><strong>{t.report.lesionValue}</strong></div>
          <div className="metricRow"><span>{t.report.riskLevel}</span><strong>{t.report.riskValue}</strong></div>
          <h2>{t.report.recommendation}</h2>
          <p>{t.report.recommendationValue}</p>
          <h2>{t.report.disclaimerTitle}</h2>
          <p>{t.report.disclaimer}</p>
        </div>
      </section>
    </main>
  );
}
