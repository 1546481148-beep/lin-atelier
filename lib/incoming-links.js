import { IncomingLinkStatus } from "@prisma/client";
import { createAuditLog } from "./audit-log";
import { prisma } from "./prisma";

const htmlEntityMap = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const githubUrlPattern = /https?:\/\/[^\s<>"'`]+/gi;

function decodeHtmlEntities(value) {
  return String(value ?? "").replace(
    /&(amp|lt|gt|quot|#39);/g,
    (match) => htmlEntityMap[match] ?? match,
  );
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getMetaContent(html, { property, name }) {
  const patterns = [];

  if (property) {
    patterns.push(
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i",
      ),
    );
    patterns.push(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`,
        "i",
      ),
    );
  }

  if (name) {
    patterns.push(
      new RegExp(
        `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i",
      ),
    );
    patterns.push(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`,
        "i",
      ),
    );
  }

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }

  return null;
}

function getTitleFromHtml(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? stripHtml(match[1]) : null;
}

function truncateText(value, maxLength = 220) {
  if (!value) {
    return null;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function trimTrailingPunctuation(url) {
  return String(url ?? "").replace(/[),.;!?]+$/g, "");
}

function collectGithubTextFields(payload) {
  const segments = [
    payload?.issue?.body,
    payload?.pull_request?.body,
    payload?.comment?.body,
    payload?.review?.body,
    payload?.discussion?.body,
    payload?.release?.body,
    payload?.head_commit?.message,
    ...(Array.isArray(payload?.commits)
      ? payload.commits.map((commit) => commit?.message)
      : []),
  ];

  return segments.filter(Boolean);
}

export function normalizeSourcePlatform(value) {
  const normalized = String(value ?? "manual")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "manual";
}

export function normalizeIncomingUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function extractUrlsFromText(value) {
  const matches = String(value ?? "").match(githubUrlPattern) ?? [];
  const urls = matches
    .map((match) => trimTrailingPunctuation(match))
    .map((match) => normalizeIncomingUrl(match))
    .filter(Boolean);

  return [...new Set(urls)];
}

export function extractIncomingUrlsFromGithubPayload(payload) {
  const textFields = collectGithubTextFields(payload);
  const urls = textFields.flatMap((field) => extractUrlsFromText(field));

  return [...new Set(urls)];
}

export async function fetchUrlMetadata(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "LinAtelierBot/1.0 (+https://lin-atelier.vercel.app; metadata parser)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`抓取失败，返回了 ${response.status}`);
  }

  const html = await response.text();

  const title =
    getMetaContent(html, { property: "og:title" }) ??
    getMetaContent(html, { name: "twitter:title" }) ??
    getTitleFromHtml(html);
  const summary =
    getMetaContent(html, { property: "og:description" }) ??
    getMetaContent(html, { name: "description" }) ??
    getMetaContent(html, { name: "twitter:description" });
  const coverImage =
    getMetaContent(html, { property: "og:image" }) ??
    getMetaContent(html, { name: "twitter:image" });

  return {
    title: title || new URL(url).hostname,
    summary: truncateText(summary),
    coverImage: coverImage || null,
  };
}

async function createIncomingLinkAttempt({
  incomingLinkId,
  actorId = null,
  action,
  status,
  message = null,
}) {
  return prisma.incomingLinkAttempt.create({
    data: {
      incomingLinkId,
      actorId,
      action,
      status,
      message,
    },
  });
}

export async function ingestIncomingLink({
  url,
  sourcePlatform,
  rawPayload = null,
  actorId = null,
  attemptAction = "RECEIVED",
}) {
  const normalizedUrl = normalizeIncomingUrl(url);

  if (!normalizedUrl) {
    throw new Error("URL 不合法，当前只支持 http 或 https 地址。");
  }

  const normalizedSource = normalizeSourcePlatform(sourcePlatform);
  const hostname = new URL(normalizedUrl).hostname;

  try {
    const metadata = await fetchUrlMetadata(normalizedUrl);

    const link = await prisma.incomingLink.upsert({
      where: { originalUrl: normalizedUrl },
      update: {
        sourcePlatform: normalizedSource,
        hostname,
        title: metadata.title,
        summary: metadata.summary,
        coverImage: metadata.coverImage,
        rawPayload,
        status: IncomingLinkStatus.READY,
        errorMessage: null,
        fetchedAt: new Date(),
        actorId,
      },
      create: {
        sourcePlatform: normalizedSource,
        originalUrl: normalizedUrl,
        hostname,
        title: metadata.title,
        summary: metadata.summary,
        coverImage: metadata.coverImage,
        rawPayload,
        status: IncomingLinkStatus.READY,
        fetchedAt: new Date(),
        actorId,
      },
    });

    await createAuditLog({
      action: "INCOMING_LINK_RECEIVED",
      actorId,
      targetType: "incoming-link",
      targetId: link.id,
      targetLabel: metadata.title || normalizedUrl,
      summary: `${normalizedSource} 推送了一条链接，系统已经完成解析。`,
    });

    await createIncomingLinkAttempt({
      incomingLinkId: link.id,
      actorId,
      action: attemptAction,
      status: IncomingLinkStatus.READY,
      message: metadata.title || normalizedUrl,
    });

    return link;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "解析时发生了未知错误。";

    const failedLink = await prisma.incomingLink.upsert({
      where: { originalUrl: normalizedUrl },
      update: {
        sourcePlatform: normalizedSource,
        hostname,
        rawPayload,
        status: IncomingLinkStatus.FAILED,
        errorMessage: message,
        actorId,
      },
      create: {
        sourcePlatform: normalizedSource,
        originalUrl: normalizedUrl,
        hostname,
        rawPayload,
        status: IncomingLinkStatus.FAILED,
        errorMessage: message,
        actorId,
      },
    });

    await createAuditLog({
      action: "INCOMING_LINK_FAILED",
      actorId,
      targetType: "incoming-link",
      targetId: failedLink.id,
      targetLabel: normalizedUrl,
      summary: `${normalizedSource} 推送了一条链接，但解析失败：${message}`,
    });

    await createIncomingLinkAttempt({
      incomingLinkId: failedLink.id,
      actorId,
      action: attemptAction,
      status: IncomingLinkStatus.FAILED,
      message,
    });

    throw error;
  }
}

export async function ingestUrlsFromGithubWebhook({
  payload,
  eventName,
  actorId = null,
}) {
  const urls = extractIncomingUrlsFromGithubPayload(payload);

  if (!urls.length) {
    throw new Error(
      "GitHub 事件里没有可解析的 URL。请在 issue、PR 或评论正文里放一个 http/https 链接。",
    );
  }

  const sourcePlatform = `github-${normalizeSourcePlatform(eventName || "event")}`;

  return Promise.all(
    urls.map((url) =>
      ingestIncomingLink({
        url,
        sourcePlatform,
        actorId,
        rawPayload: {
          eventName,
          action: payload?.action ?? null,
          sender: payload?.sender?.login ?? null,
          repository: payload?.repository?.full_name ?? null,
        },
      }),
    ),
  );
}
