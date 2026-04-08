const defaultSiteUrl = "https://example.com";

const resolvedSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  defaultSiteUrl;

function normalizeSiteUrl(url) {
  if (!url) return defaultSiteUrl;
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  return normalizedUrl.replace(/\/+$/, "");
}

export const siteConfig = {
  siteName: "Lin's Atelier",
  siteDescription:
    "一个持续更新的个人博客，记录技术、设计、做站过程和平台开发练习。",
  siteUrl: normalizeSiteUrl(resolvedSiteUrl),
};
