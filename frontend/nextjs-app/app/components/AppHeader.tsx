"use client";

import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { useLanguage } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";
import { AccessBadge } from "./AccessBadge";

export function AppHeader() {
  const { t } = useLanguage();

  async function logout() {
    await fetch("/api/access/logout", { method: "POST" });
    window.location.href = "/login";
  }

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
          <Link href="/admin">{t.nav.admin}</Link>
        </nav>
        <AccessBadge />
        <LanguageToggle />
        <button className="secondaryButton headerLogout" onClick={logout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
