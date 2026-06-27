"use client";

import Link from "next/link";
import { ClipboardList, FileText, UploadCloud } from "lucide-react";
import { AppHeader } from "./components/AppHeader";
import { useLanguage } from "./i18n";

const modules = [
  { href: "/ai", icon: UploadCloud },
  { href: "/quiz", icon: ClipboardList },
  { href: "/report", icon: FileText },
];

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <main className="shell">
      <AppHeader />

      <section className="hero">
        <div>
          <h1>{t.home.title}</h1>
          <p>{t.home.subtitle}</p>
          <Link className="primaryButton" href="/ai">{t.home.start}</Link>
        </div>
        <div className="fundusPanel" aria-label={t.home.previewLabel}>
          <div className="retina">
            <span className="disc" />
            <span className="lesion lesionA" />
            <span className="lesion lesionB" />
            <span className="vessel vesselA" />
            <span className="vessel vesselB" />
          </div>
          <div className="summaryStrip">
            <span>{t.home.riskModerate}</span>
            <span>{t.home.confidence}</span>
          </div>
        </div>
      </section>

      <section className="moduleGrid">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const content = t.home.modules[index];
          return (
            <Link className="moduleCard" href={module.href} key={module.href}>
              <Icon size={22} />
              <h2>{content.title}</h2>
              <p>{content.text}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
