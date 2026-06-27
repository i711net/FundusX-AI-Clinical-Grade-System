"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "../i18n";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="languageToggle" aria-label={t.nav.languageLabel}>
      <Languages size={18} />
      <button className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")}>
        {t.nav.chinese}
      </button>
      <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
        {t.nav.english}
      </button>
    </div>
  );
}
