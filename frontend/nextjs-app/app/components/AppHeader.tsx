"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { useLanguage } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

export function AppHeader() {
  const { t } = useLanguage();

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <Activity size={24} />
        <span>FundusX-AI</span>
      </Link>
      <div className="navCluster">
        <nav>
          <Link href="/ai">{t.nav.ai}</Link>
          <Link href="/quiz">{t.nav.quiz}</Link>
          <Link href="/report">{t.nav.report}</Link>
        </nav>
        <LanguageToggle />
      </div>
    </header>
  );
}
