import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = "https://global-citizen-ai-network.vercel.app";
const siteTitle = "全球公民 AI 網路｜Global Citizen AI Network";
const siteDescription = "GCAN 以神經智慧體六層工程閉環、四 GPT 協作治理與 A–P 工作線，串連 AI 服務、全球知識貢獻、預測學習、知識推理與深度研究，建立透明、可驗證、重視安全的 AI 協作網路。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s｜Global Citizen AI Network" },
  description: siteDescription,
  applicationName: "Global Citizen AI Network",
  keywords: ["GCAN", "Global Citizen AI Network", "全球公民 AI 網路", "AI collaboration", "Predictive Coding", "Deep Neural", "Deep Research"],
  openGraph: { type: "website", locale: "zh_TW", url: siteUrl, siteName: "Global Citizen AI Network", title: siteTitle, description: siteDescription, images: [{ url: "/brand/gcan-hero.svg", width: 1600, height: 520, alt: "Global Citizen AI Network" }] },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: ["/brand/gcan-hero.svg"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (<html lang="zh-Hant"><body>{children}</body></html>);
}
