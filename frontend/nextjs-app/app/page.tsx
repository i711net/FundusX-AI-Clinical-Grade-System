import Link from "next/link";
import { Activity, ClipboardList, FileText, UploadCloud } from "lucide-react";

const modules = [
  { href: "/ai", title: "AI Detection", text: "Upload a fundus image and generate a structured AI report.", icon: UploadCloud },
  { href: "/quiz", title: "Doctor Quiz", text: "Review 100 fundus images and compare answers with AI output.", icon: ClipboardList },
  { href: "/report", title: "Clinical Report", text: "View the report format used by the API and paper workflow.", icon: FileText },
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <Activity size={24} />
          <span>FundusX-AI</span>
        </div>
        <nav>
          <Link href="/ai">AI</Link>
          <Link href="/quiz">Quiz</Link>
          <Link href="/report">Report</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <h1>Clinically interpretable fundus image AI research system</h1>
          <p>
            A GitHub-ready project for diabetic retinopathy classification, lesion detection,
            Grad-CAM visualization, doctor testing, structured reporting, and paper reproduction.
          </p>
          <Link className="primaryButton" href="/ai">Start AI Analysis</Link>
        </div>
        <div className="fundusPanel" aria-label="fundus analysis preview">
          <div className="retina">
            <span className="disc" />
            <span className="lesion lesionA" />
            <span className="lesion lesionB" />
            <span className="vessel vesselA" />
            <span className="vessel vesselB" />
          </div>
          <div className="summaryStrip">
            <span>Risk: Moderate</span>
            <span>Confidence: 0.93</span>
          </div>
        </div>
      </section>

      <section className="moduleGrid">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link className="moduleCard" href={module.href} key={module.href}>
              <Icon size={22} />
              <h2>{module.title}</h2>
              <p>{module.text}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
