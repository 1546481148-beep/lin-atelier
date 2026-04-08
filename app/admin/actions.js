"use server";

import { PostStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  requireRole,
  requireSessionUser,
  roleLabels,
} from "../../lib/auth";
import { createAuditLog } from "../../lib/audit-log";
import { createPostReviewEvent } from "../../lib/post-review-history";
import {
  canApprove,
  canMoveToDraft,
  canReject,
  canSubmitForReview,
  postStatusLabels,
} from "../../lib/post-workflow";
import { hashPassword, verifyPassword } from "../../lib/passwords";
import { prisma } from "../../lib/prisma";

const allowedRoles = new Set(["ADMIN", "EDITOR", "READER"]);
const allowedPostFormats = new Set(["essay", "note", "tutorial", "field-log"]);

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeOptionalText(value) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function normalizeTagList(value) {
  return String(value ?? "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");
}

function normalizeHighlights(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizePostFormat(value) {
  const format = String(value ?? "essay").trim();
  return allowedPostFormats.has(format) ? format : "essay";
}

function normalizeReviewStatus(value, role) {
  const status = String(value ?? PostStatus.DRAFT).trim();

  if (role === "ADMIN") {
    if (
      status === PostStatus.DRAFT ||
      status === PostStatus.IN_REVIEW ||
      status === PostStatus.PUBLISHED
    ) {
      return status;
    }
    return PostStatus.DRAFT;
  }

  if (status === PostStatus.IN_REVIEW) {
    return PostStatus.IN_REVIEW;
  }

  return PostStatus.DRAFT;
}

function buildPostRedirect(postId, error) {
  return `/admin/posts/${postId}?error=${error}`;
}

function buildPostsListRedirect(searchParams) {
  const selectedStatus = String(searchParams?.status ?? "").trim();
  return selectedStatus ? `/admin/posts?status=${selectedStatus}` : "/admin/posts";
}

function buildPostsListResultRedirect({
  status,
  success,
  error,
  count,
  skipped,
}) {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (success) {
    params.set("success", success);
  }

  if (error) {
    params.set("error", error);
  }

  if (typeof count === "number") {
    params.set("count", String(count));
  }

  if (typeof skipped === "number") {
    params.set("skipped", String(skipped));
  }

  const query = params.toString();
  return query ? `/admin/posts?${query}` : "/admin/posts";
}

async function getAuthorizedPost(postId, user) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      reviewNote: true,
      reviewedAt: true,
    },
  });

  if (!post) {
    redirect("/admin/posts");
  }

  if (user.role !== "ADMIN" && post.authorId !== user.id) {
    redirect("/admin/posts");
  }

  return post;
}

async function getAuthorizedPosts(postIds, user) {
  const uniqueIds = [...new Set(postIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return [];
  }

  const posts = await prisma.post.findMany({
    where: {
      id: { in: uniqueIds },
      ...(user.role === "ADMIN" ? {} : { authorId: user.id }),
    },
    select: {
      id: true,
      authorId: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      reviewNote: true,
      reviewedAt: true,
    },
  });

  return uniqueIds
    .map((postId) => posts.find((post) => post.id === postId))
    .filter(Boolean);
}

export async function signInAsDemoUser(formData) {
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect("/admin/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    redirect("/admin/login");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  redirect("/admin");
}

export async function signInWithPassword(formData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=missing-fields");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/admin/login?error=invalid-credentials");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  redirect("/admin");
}

export async function createAdminUser(formData) {
  const currentUser = await requireRole(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "READER").toUpperCase();

  if (!name || !email || !password) {
    redirect("/admin/users?error=missing-fields");
  }

  if (!allowedRoles.has(role)) {
    redirect("/admin/users?error=invalid-role");
  }

  if (password.length < 8) {
    redirect("/admin/users?error=weak-password");
  }

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: hashPassword(password),
      },
    });
  } catch {
    redirect("/admin/users?error=email-taken");
  }

  await createAuditLog({
    action: "USER_CREATED",
    actorId: currentUser.id,
    targetType: "user",
    targetId: email,
    targetLabel: name,
    summary: `${currentUser.name} 新建了用户 ${name}。`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect("/admin/users?success=user-created");
}

export async function updateAdminUserRole(formData) {
  const currentUser = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "").toUpperCase();

  if (!userId) {
    redirect("/admin/users");
  }

  if (!allowedRoles.has(role)) {
    redirect("/admin/users?error=invalid-role");
  }

  if (currentUser.id === userId && role !== "ADMIN") {
    redirect("/admin/users?error=self-role-lock");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    redirect("/admin/users?error=user-missing");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  await createAuditLog({
    action: "USER_ROLE_UPDATED",
    actorId: currentUser.id,
    targetType: "user",
    targetId: userId,
    targetLabel: targetUser.name,
    summary: `${currentUser.name} 把 ${targetUser.name} 的角色改成了 ${roleLabels[role] ?? role}。`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect("/admin/users?success=role-updated");
}

export async function resetAdminUserPassword(formData) {
  const currentUser = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || !password) {
    redirect("/admin/users?error=missing-fields");
  }

  if (password.length < 8) {
    redirect("/admin/users?error=weak-password");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    redirect("/admin/users?error=user-missing");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(password),
    },
  });

  await createAuditLog({
    action: "USER_PASSWORD_RESET",
    actorId: currentUser.id,
    targetType: "user",
    targetId: userId,
    targetLabel: targetUser.name,
    summary: `${currentUser.name} 重置了 ${targetUser.name} 的密码。`,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?success=password-reset");
}

export async function updateOwnPassword(formData) {
  const user = await requireSessionUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !nextPassword || !confirmPassword) {
    redirect("/admin/account?error=missing-fields");
  }

  if (nextPassword.length < 8) {
    redirect("/admin/account?error=weak-password");
  }

  if (nextPassword !== confirmPassword) {
    redirect("/admin/account?error=password-mismatch");
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!account || !verifyPassword(currentPassword, account.passwordHash)) {
    redirect("/admin/account?error=invalid-current-password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(nextPassword),
    },
  });

  await createAuditLog({
    action: "ACCOUNT_PASSWORD_UPDATED",
    actorId: user.id,
    targetType: "account",
    targetId: user.id,
    targetLabel: user.name,
    summary: `${user.name} 修改了自己的密码。`,
  });

  revalidatePath("/admin/account");
  redirect("/admin/account?success=password-updated");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function createAdminPost(formData) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const format = normalizePostFormat(formData.get("format"));
  const tagsText = normalizeTagList(formData.get("tagsText"));
  const highlightsText = normalizeHighlights(formData.get("highlightsText"));
  const cover = normalizeOptionalText(formData.get("cover"));
  const series = normalizeOptionalText(formData.get("series"));
  const mood = normalizeOptionalText(formData.get("mood"));
  const statusValue = String(formData.get("status") ?? "DRAFT");
  const featured = formData.get("featured") === "on";
  const slug = normalizeSlug(slugInput || title);

  if (!title || !slug || !summary || !content) {
    redirect("/admin/posts/new?error=missing-fields");
  }

  const status = normalizeReviewStatus(statusValue, user.role);

  try {
    const createdPost = await prisma.post.create({
      data: {
        title,
        slug,
        summary,
        content,
        format,
        tagsText,
        highlightsText,
        cover,
        series,
        mood,
        status,
        featured,
        reviewNote: null,
        reviewedAt: status === PostStatus.PUBLISHED ? new Date() : null,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
        authorId: user.id,
      },
    });

    await createAuditLog({
      action: "POST_CREATED",
      actorId: user.id,
      targetType: "post",
      targetId: createdPost.id,
      targetLabel: title,
      summary: `${user.name} 新建了《${title}》，当前状态是${postStatusLabels[status]}。`,
    });
  } catch {
    redirect("/admin/posts/new?error=slug-taken");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function updateAdminPost(formData) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const postId = String(formData.get("postId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const format = normalizePostFormat(formData.get("format"));
  const tagsText = normalizeTagList(formData.get("tagsText"));
  const highlightsText = normalizeHighlights(formData.get("highlightsText"));
  const cover = normalizeOptionalText(formData.get("cover"));
  const series = normalizeOptionalText(formData.get("series"));
  const mood = normalizeOptionalText(formData.get("mood"));
  const statusValue = String(formData.get("status") ?? "DRAFT");
  const featured = formData.get("featured") === "on";
  const slug = normalizeSlug(slugInput || title);

  if (!postId) {
    redirect("/admin/posts");
  }

  const currentPost = await getAuthorizedPost(postId, user);

  if (!title || !slug || !summary || !content) {
    redirect(buildPostRedirect(postId, "missing-fields"));
  }

  const status = normalizeReviewStatus(statusValue, user.role);
  const nextPublishedAt =
    status === PostStatus.PUBLISHED
      ? currentPost.publishedAt ?? new Date()
      : null;
  const nextReviewedAt =
    status === PostStatus.PUBLISHED ? new Date() : status === PostStatus.IN_REVIEW ? null : currentPost.reviewedAt;
  const nextReviewNote =
    status === PostStatus.IN_REVIEW ? null : currentPost.reviewNote;

  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        slug,
        summary,
        content,
        format,
        tagsText,
        highlightsText,
        cover,
        series,
        mood,
        status,
        featured,
        reviewNote: nextReviewNote,
        reviewedAt: nextReviewedAt,
        publishedAt: nextPublishedAt,
      },
    });
  } catch {
    redirect(buildPostRedirect(postId, "slug-taken"));
  }

  await createAuditLog({
    action: "POST_UPDATED",
    actorId: user.id,
    targetType: "post",
    targetId: postId,
    targetLabel: title,
    summary: `${user.name} 修改了《${title}》，当前状态是${postStatusLabels[status]}。`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${postId}`);
  redirect("/admin/posts?success=post-saved");
}

export async function submitAdminPostForReview(formData) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const postId = String(formData.get("postId") ?? "");

  if (!postId) {
    redirect("/admin/posts");
  }

  const post = await getAuthorizedPost(postId, user);

  if (!canSubmitForReview(post.status)) {
    redirect("/admin/posts?error=invalid-review-transition");
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.IN_REVIEW,
      reviewNote: null,
      reviewedAt: null,
      publishedAt: null,
    },
  });

  await createPostReviewEvent({
    postId,
    actorId: user.id,
    action: "SUBMITTED",
    fromStatus: post.status,
    toStatus: PostStatus.IN_REVIEW,
  });

  await createAuditLog({
    action: "POST_SUBMITTED",
    actorId: user.id,
    targetType: "post",
    targetId: postId,
    targetLabel: post.title,
    summary: `${user.name} 提交了《${post.title}》进入审核。`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${postId}`);
  redirect("/admin/posts?success=post-submitted");
}

export async function approveAdminPost(formData) {
  await requireRole(["ADMIN"]);
  const postId = String(formData.get("postId") ?? "");

  if (!postId) {
    redirect("/admin/posts");
  }

  const user = await requireSessionUser();
  const post = await getAuthorizedPost(postId, user);

  if (!canApprove(post.status)) {
    redirect("/admin/posts?error=invalid-approve-transition");
  }

  const now = new Date();

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.PUBLISHED,
      reviewNote: null,
      reviewedAt: now,
      publishedAt: now,
    },
  });

  await createPostReviewEvent({
    postId,
    actorId: user.id,
    action: "APPROVED",
    fromStatus: post.status,
    toStatus: PostStatus.PUBLISHED,
  });

  await createAuditLog({
    action: "POST_APPROVED",
    actorId: user.id,
    targetType: "post",
    targetId: postId,
    targetLabel: post.title,
    summary: `${user.name} 通过审核并发布了《${post.title}》。`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${postId}`);
  redirect("/admin/posts?success=post-published");
}

export async function rejectAdminPost(formData) {
  await requireRole(["ADMIN"]);
  const postId = String(formData.get("postId") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!postId) {
    redirect("/admin/posts");
  }

  if (!reviewNote) {
    redirect(buildPostRedirect(postId, "missing-review-note"));
  }

  const user = await requireSessionUser();
  const post = await getAuthorizedPost(postId, user);

  if (!canReject(post.status)) {
    redirect("/admin/posts?error=invalid-reject-transition");
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.REJECTED,
      reviewNote,
      reviewedAt: new Date(),
      publishedAt: null,
    },
  });

  await createPostReviewEvent({
    postId,
    actorId: user.id,
    action: "REJECTED",
    fromStatus: post.status,
    toStatus: PostStatus.REJECTED,
    note: reviewNote,
  });

  await createAuditLog({
    action: "POST_REJECTED",
    actorId: user.id,
    targetType: "post",
    targetId: postId,
    targetLabel: post.title,
    summary: `${user.name} 驳回了《${post.title}》：${reviewNote}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${postId}`);
  redirect("/admin/posts?success=post-rejected");
}

export async function moveAdminPostToDraft(formData) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const postId = String(formData.get("postId") ?? "");

  if (!postId) {
    redirect("/admin/posts");
  }

  const post = await getAuthorizedPost(postId, user);

  if (!canMoveToDraft(user.role, post.status)) {
    redirect("/admin/posts?error=invalid-draft-transition");
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.DRAFT,
      publishedAt: null,
    },
  });

  await createPostReviewEvent({
    postId,
    actorId: user.id,
    action: "MOVED_TO_DRAFT",
    fromStatus: post.status,
    toStatus: PostStatus.DRAFT,
  });

  await createAuditLog({
    action: "POST_MOVED_TO_DRAFT",
    actorId: user.id,
    targetType: "post",
    targetId: postId,
    targetLabel: post.title,
    summary: `${user.name} 把《${post.title}》转回了草稿。`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${postId}`);
  redirect("/admin/posts?success=post-moved-to-draft");
}

export async function runBulkAdminPostAction(formData) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const postIds = formData
    .getAll("postIds")
    .map((value) => String(value))
    .filter(Boolean);
  const bulkAction = String(formData.get("bulkAction") ?? "");
  const selectedStatus = String(formData.get("currentStatus") ?? "").trim();
  const posts = await getAuthorizedPosts(postIds, user);

  if (!postIds.length) {
    redirect(
      buildPostsListResultRedirect({
        status: selectedStatus,
        error: "missing-selection",
      }),
    );
  }

  let processedCount = 0;
  let skippedCount = 0;

  for (const post of posts) {
    if (bulkAction === "submit" && canSubmitForReview(post.status)) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: PostStatus.IN_REVIEW,
          reviewNote: null,
          reviewedAt: null,
          publishedAt: null,
        },
      });

      await createPostReviewEvent({
        postId: post.id,
        actorId: user.id,
        action: "SUBMITTED",
        fromStatus: post.status,
        toStatus: PostStatus.IN_REVIEW,
      });

      await createAuditLog({
        action: "POST_SUBMITTED",
        actorId: user.id,
        targetType: "post",
        targetId: post.id,
        targetLabel: post.title,
        summary: `${user.name} 批量提交了《${post.title}》进入审核。`,
      });

      processedCount += 1;
      continue;
    }

    if (
      bulkAction === "approve" &&
      user.role === "ADMIN" &&
      canApprove(post.status)
    ) {
      const now = new Date();

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: PostStatus.PUBLISHED,
          reviewNote: null,
          reviewedAt: now,
          publishedAt: now,
        },
      });

      await createPostReviewEvent({
        postId: post.id,
        actorId: user.id,
        action: "APPROVED",
        fromStatus: post.status,
        toStatus: PostStatus.PUBLISHED,
      });

      await createAuditLog({
        action: "POST_APPROVED",
        actorId: user.id,
        targetType: "post",
        targetId: post.id,
        targetLabel: post.title,
        summary: `${user.name} 批量通过并发布了《${post.title}》。`,
      });

      processedCount += 1;
      continue;
    }

    if (bulkAction === "draft" && canMoveToDraft(user.role, post.status)) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: PostStatus.DRAFT,
          publishedAt: null,
        },
      });

      await createPostReviewEvent({
        postId: post.id,
        actorId: user.id,
        action: "MOVED_TO_DRAFT",
        fromStatus: post.status,
        toStatus: PostStatus.DRAFT,
      });

      await createAuditLog({
        action: "POST_MOVED_TO_DRAFT",
        actorId: user.id,
        targetType: "post",
        targetId: post.id,
        targetLabel: post.title,
        summary: `${user.name} 批量把《${post.title}》转回了草稿。`,
      });

      processedCount += 1;
      continue;
    }

    skippedCount += 1;
  }

  for (const postId of postIds) {
    revalidatePath(`/admin/posts/${postId}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/review");

  if (!processedCount) {
    redirect(
      buildPostsListResultRedirect({
        status: selectedStatus,
        error: "batch-no-op",
        skipped: skippedCount || postIds.length,
      }),
    );
  }

  const successCode =
    bulkAction === "submit"
      ? "batch-submitted"
      : bulkAction === "approve"
        ? "batch-published"
        : "batch-moved-to-draft";

  redirect(
    buildPostsListResultRedirect({
      status: selectedStatus,
      success: successCode,
      count: processedCount,
      skipped: skippedCount,
    }),
  );
}
