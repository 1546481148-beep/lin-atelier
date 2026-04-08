import { getAllPosts, getAllTags } from "../lib/posts";
import { siteConfig } from "../lib/site";

export default async function sitemap() {
  const staticRoutes = ["", "/about", "/tags", "/archive"].map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: new Date(),
  }));

  const posts = await getAllPosts();
  const tags = await getAllTags(posts);

  const postRoutes = posts.map((post) => ({
    url: `${siteConfig.siteUrl}/posts/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const tagRoutes = tags.map(({ tag }) => ({
    url: `${siteConfig.siteUrl}/tags/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...postRoutes, ...tagRoutes];
}
