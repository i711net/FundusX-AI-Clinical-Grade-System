import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "FundusX-AI",
  description: "Clinical research prototype for fundus image AI analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
