const defaultSiteUrl = "https://example.com";

function normalizeSiteUrl(url) {
  if (!url) return defaultSiteUrl;
  return url.replace(/\/+$/, "");
}

export const siteConfig = {
  siteName: "Lin's Atelier",
  siteDescription:
    "一个持续更新的个人博客，记录技术、设计、做站过程和平台开发练习。",
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
};
