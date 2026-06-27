"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../i18n";
import { FundusImage, isSupabaseConfigured, supabase } from "../lib/supabase";

const QUESTION_COUNT = 10;
const GRADES = [0, 1, 2, 3, 4];

type Answer = {
  imageId: string;
  selectedGrade: number;
  referenceGrade: number;
};

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function loadBalancedQuestions() {
  const perGrade = Math.max(1, Math.floor(QUESTION_COUNT / GRADES.length));
  const gradeResults = await Promise.all(
    GRADES.map(async (grade) => {
      const { data, error } = await supabase
        .from("fundus_images")
        .select("*")
        .eq("image_type", "quiz")
        .eq("is_active", true)
        .eq("disease_grade", grade)
        .limit(500);

      if (error) throw error;
      return shuffle((data || []) as FundusImage[]);
    })
  );

  const picked: FundusImage[] = [];
  const used = new Set<string>();

  for (const group of gradeResults) {
    for (const image of group.slice(0, perGrade)) {
      picked.push(image);
      used.add(image.id);
    }
  }

  const remaining = shuffle(gradeResults.flat().filter((image) => !used.has(image.id)));
  for (const image of remaining) {
    if (picked.length >= QUESTION_COUNT) break;
    picked.push(image);
  }

  return shuffle(picked).slice(0, QUESTION_COUNT);
}

export default function QuizPage() {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<FundusImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const [reviewImageId, setReviewImageId] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const displayedAnswers = finished ? finalAnswers : answers;
  const score = useMemo(
    () => displayedAnswers.filter((answer) => answer.selectedGrade === answer.referenceGrade).length,
    [displayedAnswers]
  );

  async function startQuiz() {
    setLoading(true);
    setMessage("");
    setFinished(false);
    setAnswers([]);
    setFinalAnswers([]);
    setCurrentIndex(0);
    setSelected(null);

    if (!isSupabaseConfigured) {
      setMessage("请先配置 Supabase 环境变量。/ Please configure Supabase first.");
      setLoading(false);
      return;
    }

    let picked: FundusImage[] = [];
    try {
      picked = await loadBalancedQuestions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "题库加载失败 / Failed to load quiz images");
      setLoading(false);
      return;
    }
    if (picked.length < QUESTION_COUNT) {
      setMessage(`题库中可用图片不足${QUESTION_COUNT}张。请先到后台上传图片并填写正确分级。`);
    }
    setQuestions(picked);
    setLoading(false);
  }

  useEffect(() => {
    startQuiz();
  }, []);

  async function saveAnswer() {
    if (!currentQuestion || selected === null || currentQuestion.disease_grade === null) return;

    const answer: Answer = {
      imageId: currentQuestion.id,
      selectedGrade: selected,
      referenceGrade: currentQuestion.disease_grade,
    };

    const nextAnswers = [...answers.filter((item) => item.imageId !== currentQuestion.id), answer];
    setAnswers(nextAnswers);

    await supabase.from("doctor_quiz_responses").insert({
      image_id: currentQuestion.id,
      selected_grade: selected,
      reference_grade: currentQuestion.disease_grade,
      is_correct: selected === currentQuestion.disease_grade,
    });

    if (currentIndex + 1 >= questions.length) {
      setFinalAnswers(nextAnswers);
      setFinished(true);
      return;
    }

    setCurrentIndex((value) => value + 1);
    setSelected(null);
  }

  function answerFor(imageId: string) {
    return displayedAnswers.find((answer) => answer.imageId === imageId);
  }

  const reviewQuestion = questions.find((question) => question.id === reviewImageId);
  const reviewAnswer = reviewQuestion ? answerFor(reviewQuestion.id) : undefined;

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> {t.nav.home}</Link>
        <LanguageToggle />
      </div>
      <section className="workspace">
        <div className="quizImage">
          {loading && <Loader2 size={34} className="spin" />}
          {!loading && currentQuestion && (
            <>
              <img className="quizFundusImage" src={currentQuestion.image_url} alt={currentQuestion.title || currentQuestion.image_code || "quiz fundus"} />
              <p>{currentQuestion.image_code || currentQuestion.title || `${t.quiz.image} ${currentIndex + 1}`}</p>
              <p>{t.quiz.image} {String(currentIndex + 1).padStart(2, "0")} / {questions.length}</p>
            </>
          )}
          {!loading && !currentQuestion && <p className="muted">{message || "暂无可用题目 / No quiz images available"}</p>}
        </div>
        <div className="uploadPanel">
          <h1>{t.quiz.title}</h1>
          <p>系统会从题库随机抽取10张启用图片。答题结束后显示成绩和正确答案。</p>
          {message && <div className="notice">{message}</div>}

          {!finished && currentQuestion && (
            <>
              <div className="gradeGrid">
                {t.quiz.grades.map((grade, gradeIndex) => (
                  <button
                    className={selected === gradeIndex ? "gradeButton active" : "gradeButton"}
                    key={grade}
                    onClick={() => setSelected(gradeIndex)}
                  >
                    {gradeIndex} - {grade}
                  </button>
                ))}
              </div>
              <button className="primaryButton" disabled={selected === null} onClick={saveAnswer}>
                {currentIndex + 1 >= questions.length ? "提交并查看成绩 / Submit" : "保存并下一题 / Next"}
              </button>
            </>
          )}

          {finished && (
            <div className="resultStack">
              <div className="scorePanel">
                <CheckCircle2 size={26} />
                <div>
                  <span>考试完成 / Exam complete</span>
                  <strong>{score} / {questions.length}</strong>
                  <p>正确率 / Accuracy: {questions.length ? Math.round((score / questions.length) * 100) : 0}%</p>
                </div>
              </div>
              <div className="quizReviewList">
                {questions.map((question, index) => {
                  const answer = answerFor(question.id);
                  const correct = answer?.selectedGrade === question.disease_grade;
                  return (
                    <article
                      className={correct ? "reviewItem correct" : "reviewItem wrong"}
                      key={question.id}
                      onClick={() => setReviewImageId(question.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") setReviewImageId(question.id);
                      }}
                    >
                      <img src={question.image_url} alt={question.title || question.image_code || "review"} />
                      <div>
                        <strong>{index + 1}. {question.image_code || question.title || question.id}</strong>
                        <span>你的答案 / Your answer: {answer ? t.quiz.grades[answer.selectedGrade] : "-"}</span>
                        <span>正确答案 / Correct: {question.disease_grade !== null ? t.quiz.grades[question.disease_grade] : "-"}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
              <button className="secondaryButton inlineButton" onClick={startQuiz}>
                <RotateCcw size={18} /> 再考一次 / Restart
              </button>
            </div>
          )}

          {!currentQuestion && (
            <button className="secondaryButton inlineButton" onClick={startQuiz} disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <RotateCcw size={18} />} 重新抽题 / Reload
            </button>
          )}
        </div>
      </section>
      {reviewQuestion && (
        <div className="imageModal" role="dialog" aria-modal="true">
          <div className="imageModalContent">
            <button className="modalClose" onClick={() => setReviewImageId(null)} aria-label="Close">
              <X size={22} />
            </button>
            <img src={reviewQuestion.image_url} alt={reviewQuestion.title || reviewQuestion.image_code || "review large"} />
            <div className="modalInfo">
              <strong>{reviewQuestion.image_code || reviewQuestion.title || reviewQuestion.id}</strong>
              <span>你的答案 / Your answer: {reviewAnswer ? t.quiz.grades[reviewAnswer.selectedGrade] : "-"}</span>
              <span>正确答案 / Correct: {reviewQuestion.disease_grade !== null ? t.quiz.grades[reviewQuestion.disease_grade] : "-"}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
