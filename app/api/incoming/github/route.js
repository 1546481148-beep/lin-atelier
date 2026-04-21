import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ingestUrlsFromGithubWebhook } from "../../../../lib/incoming-links";

export const runtime = "nodejs";

function isAuthorized(rawBody, request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

export async function POST(request) {
  const rawBody = await request.text();

  if (!isAuthorized(rawBody, request)) {
    return NextResponse.json(
      { ok: false, error: "missing-or-invalid-signature" },
      { status: 401 },
    );
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const eventName = request.headers.get("x-github-event") ?? "unknown";
    const links = await ingestUrlsFromGithubWebhook({
      payload,
      eventName,
    });

    return NextResponse.json({
      ok: true,
      eventName,
      count: links.length,
      items: links.map((link) => ({
        id: link.id,
        url: link.originalUrl,
        title: link.title,
        status: link.status,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unexpected-error",
      },
      { status: 500 },
    );
  }
}
