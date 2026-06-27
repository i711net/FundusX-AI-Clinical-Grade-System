"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const grades = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"];

export default function QuizPage() {
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
      <Link className="backLink" href="/"><ArrowLeft size={18} /> Home</Link>
      <section className="workspace">
        <div className="quizImage">
          <div className="retina large">
            <span className="disc" />
            <span className="lesion lesionA" />
            <span className="lesion lesionB" />
            <span className="vessel vesselA" />
            <span className="vessel vesselB" />
          </div>
          <p>Image {index.toString().padStart(3, "0")} / 100</p>
        </div>
        <div className="uploadPanel">
          <h1>Doctor Quiz</h1>
          <p>Select a diabetic retinopathy grade for each of 100 fundus images. Connect this page to Supabase when real images are ready.</p>
          <div className="gradeGrid">
            {grades.map((grade, gradeIndex) => (
              <button
                className={selected === gradeIndex ? "gradeButton active" : "gradeButton"}
                key={grade}
                onClick={() => setSelected(gradeIndex)}
              >
                {grade}
              </button>
            ))}
          </div>
          <button className="primaryButton" disabled={selected === null} onClick={() => setSaved(true)}>Save Response</button>
          {saved && <p className="success"><CheckCircle2 size={18} /> Response saved locally for demo.</p>}
          <button className="secondaryButton" onClick={next}>Next Image</button>
        </div>
      </section>
    </main>
  );
}
