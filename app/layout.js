import "./globals.css";
import { siteConfig } from "../lib/site";

export const metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.siteName,
    template: `%s | ${siteConfig.siteName}`,
  },
  description: siteConfig.siteDescription,
  applicationName: siteConfig.siteName,
  keywords: ["个人博客", "技术写作", "Next.js", "Markdown", "中文博客"],
  openGraph: {
    title: siteConfig.siteName,
    description: siteConfig.siteDescription,
    type: "website",
    locale: "zh_CN",
    url: siteConfig.siteUrl,
  },
  alternates: {
    canonical: siteConfig.siteUrl,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
