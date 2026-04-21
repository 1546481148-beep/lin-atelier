import { NextResponse } from "next/server";
import { ingestIncomingLink, normalizeSourcePlatform } from "../../../../lib/incoming-links";

function isAuthorized(request) {
  const expectedToken = process.env.INCOMING_WEBHOOK_TOKEN;

  if (!expectedToken) {
    return true;
  }

  const headerToken = request.headers.get("x-incoming-token");
  return headerToken === expectedToken;
}

async function readIncomingPayload(request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  return {};
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "missing-or-invalid-token" },
      { status: 401 },
    );
  }

  try {
    const payload = await readIncomingPayload(request);
    const url = String(payload.url ?? payload.link ?? "").trim();
    const sourcePlatform = normalizeSourcePlatform(payload.sourcePlatform ?? payload.source ?? "webhook");

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "missing-url" },
        { status: 400 },
      );
    }

    const incomingLink = await ingestIncomingLink({
      url,
      sourcePlatform,
      rawPayload: payload,
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: incomingLink.id,
        url: incomingLink.originalUrl,
        title: incomingLink.title,
        status: incomingLink.status,
      },
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
