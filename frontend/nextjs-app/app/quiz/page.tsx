"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../i18n";

export default function QuizPage() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  function next() {
    setIndex((current) => Math.min(current + 1, 100));
    setSelected(null);
    setSaved(false);
  }

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> {t.nav.home}</Link>
        <LanguageToggle />
      </div>
      <section className="workspace">
        <div className="quizImage">
          <div className="retina large">
            <span className="disc" />
            <span className="lesion lesionA" />
            <span className="lesion lesionB" />
            <span className="vessel vesselA" />
            <span className="vessel vesselB" />
          </div>
          <p>{t.quiz.image} {index.toString().padStart(3, "0")} / 100</p>
        </div>
        <div className="uploadPanel">
          <h1>{t.quiz.title}</h1>
          <p>{t.quiz.intro}</p>
          <div className="gradeGrid">
            {t.quiz.grades.map((grade, gradeIndex) => (
              <button
                className={selected === gradeIndex ? "gradeButton active" : "gradeButton"}
                key={grade}
                onClick={() => setSelected(gradeIndex)}
              >
                {grade}
              </button>
            ))}
          </div>
          <button className="primaryButton" disabled={selected === null} onClick={() => setSaved(true)}>{t.quiz.save}</button>
          {saved && <p className="success"><CheckCircle2 size={18} /> {t.quiz.saved}</p>}
          <button className="secondaryButton" onClick={next}>{t.quiz.next}</button>
        </div>
      </section>
    </main>
  );
}
