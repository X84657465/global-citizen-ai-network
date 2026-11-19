import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = "https://global-citizen-ai-network.vercel.app";
const siteTitle = "全球公民 AI 網路｜Global Citizen AI Network";
const siteDescription = "讓每個人都能使用 AI，也能透過經驗、知識與貢獻共同建設 AI。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s｜Global Citizen AI Network",
  },
  description: siteDescription,
  applicationName: "Global Citizen AI Network",
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: siteUrl,
    siteName: "Global Citizen AI Network",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}