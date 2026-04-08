import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PostStatus } from "@prisma/client";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { prisma } from "./prisma";

const postsDirectory = path.join(process.cwd(), "content", "posts");
let hasWarnedAboutDatabaseFallback = false;

const postFormats = {
  essay: {
    label: "长文",
    description: "把一个问题慢慢写开，适合复盘、判断和较完整的思路。",
  },
  note: {
    label: "速记",
    description: "先把当下的念头和观察记下来，不要求一次写完整。",
  },
  tutorial: {
    label: "指南",
    description: "把步骤和方法整理清楚，方便以后直接照着做。",
  },
  "field-log": {
    label: "现场记录",
    description: "记录做事过程里的判断、变化和一些当场留下的笔记。",
  },
};

function compareByDateDesc(a, b) {
  return new Date(b.date) - new Date(a.date);
}

function isDatabaseUrlConfigured() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  return (
    databaseUrl.startsWith("postgresql://") ||
    databaseUrl.startsWith("postgres://")
  );
}

function warnAboutDatabaseFallback(reason, error) {
  if (hasWarnedAboutDatabaseFallback) {
    return;
  }

  hasWarnedAboutDatabaseFallback = true;
  console.warn(`[posts] ${reason}，公开页暂时回退到 Markdown 内容。`);

  if (error) {
    console.warn(error);
  }
}

function toYearMonthKey(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function formatArchiveLabel(key) {
  const [year, month] = key.split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function ensurePostsDirectory() {
  if (!fs.existsSync(postsDirectory)) {
    throw new Error("文章目录不存在: content/posts");
  }
}

function normalizeTags(tags, fileName) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
    throw new Error(`文章 ${fileName} 的 tags 必须是字符串数组`);
  }
  return tags;
}

function normalizeHighlights(highlights, fileName) {
  if (highlights === undefined) return [];
  if (
    !Array.isArray(highlights) ||
    highlights.some((item) => typeof item !== "string")
  ) {
    throw new Error(`文章 ${fileName} 的 highlights 必须是字符串数组`);
  }
  return highlights;
}

function parseTagList(value) {
  return String(value ?? "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseHighlightList(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function estimateReadingTime(content) {
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (content.match(/[A-Za-z0-9_]+/g) || []).length;
  const totalUnits = chineseChars + englishWords;
  return Math.max(1, Math.ceil(totalUnits / 320));
}

function validateFrontmatter(data, fileName) {
  const requiredFields = ["title", "date", "summary"];

  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== "string") {
      throw new Error(`文章 ${fileName} 缺少必填 frontmatter: ${field}`);
    }
  }

  if (Number.isNaN(new Date(data.date).getTime())) {
    throw new Error(`文章 ${fileName} 的 date 不是合法日期`);
  }

  if (data.cover !== undefined && typeof data.cover !== "string") {
    throw new Error(`文章 ${fileName} 的 cover 必须是字符串`);
  }

  if (data.draft !== undefined && typeof data.draft !== "boolean") {
    throw new Error(`文章 ${fileName} 的 draft 必须是布尔值`);
  }

  if (data.featured !== undefined && typeof data.featured !== "boolean") {
    throw new Error(`文章 ${fileName} 的 featured 必须是布尔值`);
  }

  if (data.series !== undefined && typeof data.series !== "string") {
    throw new Error(`文章 ${fileName} 的 series 必须是字符串`);
  }

  if (data.mood !== undefined && typeof data.mood !== "string") {
    throw new Error(`文章 ${fileName} 的 mood 必须是字符串`);
  }

  if (data.format !== undefined && typeof data.format !== "string") {
    throw new Error(`文章 ${fileName} 的 format 必须是字符串`);
  }

  if (data.format !== undefined && !postFormats[data.format]) {
    throw new Error(
      `文章 ${fileName} 的 format 不合法，可选值为 ${Object.keys(postFormats).join(", ")}`,
    );
  }

  return {
    title: data.title,
    date: data.date,
    summary: data.summary,
    tags: normalizeTags(data.tags, fileName),
    highlights: normalizeHighlights(data.highlights, fileName),
    cover: data.cover ?? null,
    draft: data.draft ?? false,
    featured: data.featured ?? false,
    series: data.series ?? null,
    mood: data.mood ?? null,
    format: data.format ?? "essay",
  };
}

function enrichPost(record) {
  return {
    ...record,
    formatLabel: postFormats[record.format].label,
    formatDescription: postFormats[record.format].description,
    readingTime: estimateReadingTime(record.content),
  };
}

function readMarkdownPostFile(slug) {
  ensurePostsDirectory();
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`找不到文章: ${slug}`);
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const frontmatter = validateFrontmatter(data, path.basename(fullPath));

  return enrichPost({
    slug,
    ...frontmatter,
    source: "markdown",
    content,
  });
}

function getMarkdownPostsInternal() {
  ensurePostsDirectory();

  const fileNames = fs.readdirSync(postsDirectory).filter((fileName) =>
    fileName.endsWith(".md"),
  );

  return fileNames
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      return readMarkdownPostFile(slug);
    })
    .filter((post) => !post.draft);
}

function toPublicDbPost(post) {
  const publishedDate =
    post.publishedAt ?? post.updatedAt ?? post.createdAt ?? new Date();

  return enrichPost({
    slug: post.slug,
    title: post.title,
    date: publishedDate.toISOString(),
    summary: post.summary,
    tags: parseTagList(post.tagsText),
    highlights: parseHighlightList(post.highlightsText),
    cover: post.cover ?? null,
    draft: false,
    featured: post.featured,
    series: post.series ?? null,
    mood: post.mood ?? null,
    format: post.format && postFormats[post.format] ? post.format : "essay",
    source: "database",
    authorName: post.author?.name ?? null,
    content: post.content,
  });
}

async function getDatabasePublishedPostsInternal() {
  if (!isDatabaseUrlConfigured()) {
    warnAboutDatabaseFallback("DATABASE_URL 还没有切到 Postgres");
    return [];
  }

  let posts = [];

  try {
    posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    warnAboutDatabaseFallback("数据库暂时不可用", error);
    return [];
  }

  return posts.map(toPublicDbPost);
}

async function getDatabasePostBySlug(slug) {
  if (!isDatabaseUrlConfigured()) {
    return null;
  }

  try {
    return await prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    warnAboutDatabaseFallback("数据库暂时不可用", error);
    return null;
  }
}

function dedupePostsBySlug(posts) {
  const slugMap = new Map();

  for (const post of posts) {
    if (!slugMap.has(post.slug)) {
      slugMap.set(post.slug, post);
    }
  }

  return [...slugMap.values()].sort(compareByDateDesc);
}

async function processPostContent(content) {
  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(content);

  return processedContent.toString();
}

export async function getAllPosts() {
  const [databasePosts, markdownPosts] = await Promise.all([
    getDatabasePublishedPostsInternal(),
    Promise.resolve(getMarkdownPostsInternal()),
  ]);

  const posts = dedupePostsBySlug([...databasePosts, ...markdownPosts]);

  return posts.map(({ content, ...post }) => post);
}

export async function getFormatSummary(posts = null) {
  const sourcePosts = posts ?? (await getAllPosts());

  return Object.entries(postFormats)
    .map(([key, meta]) => ({
      key,
      ...meta,
      count: sourcePosts.filter((post) => post.format === key).length,
    }))
    .filter((item) => item.count > 0);
}

export function getFormatMeta(format) {
  return postFormats[format] ?? postFormats.essay;
}

export async function getAllTags(posts = null) {
  const sourcePosts = posts ?? (await getAllPosts());
  const tagCountMap = new Map();

  sourcePosts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
    });
  });

  return [...tagCountMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
}

export async function getPostsByTag(tag) {
  const posts = await getAllPosts();
  return posts.filter((post) => post.tags.includes(tag));
}

export async function getArchiveGroups(posts = null) {
  const sourcePosts = posts ?? (await getAllPosts());
  const archiveMap = new Map();

  sourcePosts.forEach((post) => {
    const key = toYearMonthKey(post.date);
    const existing = archiveMap.get(key) ?? [];
    existing.push(post);
    archiveMap.set(key, existing);
  });

  return [...archiveMap.entries()]
    .map(([key, groupPosts]) => ({
      key,
      label: formatArchiveLabel(key),
      count: groupPosts.length,
      posts: groupPosts.sort(compareByDateDesc),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export async function getRelatedPosts(slug, limit = 3) {
  const posts = await getAllPosts();
  const currentPost = posts.find((post) => post.slug === slug);

  if (!currentPost) {
    return [];
  }

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) =>
        currentPost.tags.includes(tag),
      ).length;
      const sameFormat = post.format === currentPost.format ? 1 : 0;

      return {
        ...post,
        _score: sharedTags * 2 + sameFormat,
      };
    })
    .sort((a, b) => b._score - a._score || compareByDateDesc(a, b))
    .slice(0, limit)
    .map(({ _score, ...post }) => post);
}

export async function getPostBySlug(slug) {
  const databasePost = await getDatabasePostBySlug(slug);

  if (databasePost?.status === PostStatus.PUBLISHED) {
    const post = toPublicDbPost(databasePost);
    return {
      ...post,
      contentHtml: await processPostContent(post.content),
    };
  }

  if (databasePost) {
    throw new Error(`文章 ${slug} 还没有公开`);
  }

  const markdownPost = readMarkdownPostFile(slug);

  if (markdownPost.draft) {
    throw new Error(`文章 ${slug} 还没有公开`);
  }

  return {
    ...markdownPost,
    contentHtml: await processPostContent(markdownPost.content),
  };
}
