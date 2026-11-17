import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "全球公民 AI 網路｜Global Citizen AI Network",
  description: "讓每個人都能使用 AI，也能透過經驗、知識與貢獻共同建設 AI。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}