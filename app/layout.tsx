import type { Metadata } from "next";
import { LanguageProvider } from "./i18n";
import "./styles.css";

export const metadata: Metadata = {
  title: "FundusX-AI",
  description: "Clinical research prototype for fundus image AI analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
