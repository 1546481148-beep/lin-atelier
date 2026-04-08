import Link from "next/link";
import { PostStatus } from "@prisma/client";
import { requireRole } from "../../../../lib/auth";
import AdminPostsWorkbench from "../../../../components/admin-posts-workbench";
import { getRolePostGuidance } from "../../../../lib/post-workflow";
import { prisma } from "../../../../lib/prisma";

export const metadata = {
  title: "文章管理",
  description: "查看后台文章、状态和处理队列。",
};

function getSuccessMessage(code, count, skipped) {
  const suffix =
    typeof skipped === "number" && skipped > 0 ? `，另有 ${skipped} 篇不符合当前动作，已跳过。` : "。";

  switch (code) {
    case "post-saved":
      return "文章已经保存。";
    case "post-submitted":
      return "文章已经提交审核。";
    case "post-published":
      return "文章已经通过审核并发布。";
    case "post-rejected":
      return "文章已经驳回，等继续修改。";
    case "post-moved-to-draft":
      return "文章已经转回草稿。";
    case "batch-submitted":
      return `已批量提交 ${count ?? 0} 篇文章进入审核${suffix}`;
    case "batch-published":
      return `已批量通过并发布 ${count ?? 0} 篇文章${suffix}`;
    case "batch-moved-to-draft":
      return `已批量转回 ${count ?? 0} 篇文章到草稿${suffix}`;
    default:
      return null;
  }
}

function getErrorMessage(code, skipped) {
  switch (code) {
    case "invalid-review-transition":
      return "当前状态不能直接提交审核。";
    case "invalid-approve-transition":
      return "只有待审核内容才能通过并发布。";
    case "invalid-reject-transition":
      return "只有待审核内容才能驳回。";
    case "invalid-draft-transition":
      return "当前状态不能转回草稿。";
    case "missing-selection":
      return "先勾选要一起处理的文章，再执行批量动作。";
    case "batch-no-op":
      return `这次没有成功处理任何文章${typeof skipped === "number" && skipped > 0 ? `，共有 ${skipped} 篇不符合当前动作。` : "。"}`;
    default:
      return null;
  }
}

const statusFilters = [
  { value: "all", label: "全部" },
  { value: PostStatus.IN_REVIEW, label: "待审核" },
  { value: PostStatus.DRAFT, label: "草稿" },
  { value: PostStatus.PUBLISHED, label: "已发布" },
  { value: PostStatus.REJECTED, label: "已驳回" },
];

function getStatusFilter(value) {
  if (statusFilters.some((item) => item.value === value)) {
    return value;
  }

  return "all";
}

function buildStatusHref(status) {
  return status === "all" ? "/admin/posts" : `/admin/posts?status=${status}`;
}

export default async function AdminPostsPage({ searchParams }) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const params = await searchParams;
  const selectedStatus = getStatusFilter(params?.status);
  const baseWhere = user.role === "ADMIN" ? {} : { authorId: user.id };
  const where = {
    ...baseWhere,
    ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
  };
  const resultCount = Number.isFinite(Number(params?.count))
    ? Number(params?.count)
    : null;
  const skippedCount = Number.isFinite(Number(params?.skipped))
    ? Number(params?.skipped)
    : null;

  const success = getSuccessMessage(params?.success, resultCount, skippedCount);
  const error = getErrorMessage(params?.error, skippedCount);
  const roleGuidance = getRolePostGuidance(user.role);

  const [posts, draftCount, reviewCount, publishedCount, rejectedCount] =
    await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        include: {
          author: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.post.count({
        where: { ...baseWhere, status: PostStatus.DRAFT },
      }),
      prisma.post.count({
        where: { ...baseWhere, status: PostStatus.IN_REVIEW },
      }),
      prisma.post.count({
        where: { ...baseWhere, status: PostStatus.PUBLISHED },
      }),
      prisma.post.count({
        where: { ...baseWhere, status: PostStatus.REJECTED },
      }),
    ]);

  const countMap = {
    all: draftCount + reviewCount + publishedCount + rejectedCount,
    [PostStatus.DRAFT]: draftCount,
    [PostStatus.IN_REVIEW]: reviewCount,
    [PostStatus.PUBLISHED]: publishedCount,
    [PostStatus.REJECTED]: rejectedCount,
  };

  const heading =
    selectedStatus === PostStatus.IN_REVIEW
      ? user.role === "ADMIN"
        ? "待审核内容"
        : "我提交出去的待审核内容"
      : user.role === "ADMIN"
        ? "全部后台文章"
        : "我的后台文章";

  const intro =
    selectedStatus === PostStatus.IN_REVIEW
      ? user.role === "ADMIN"
        ? "先处理正在等结果的文章。管理员的重点不是继续写，而是判断哪些内容可以公开、哪些需要退回。"
        : "这里能看到你已经交出去、正在等结果的内容。接下来主要是等管理员处理，或者在需要时撤回继续改。"
      : roleGuidance.list;

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">文章</p>
          <h2>{heading}</h2>
        </div>
        <Link href="/admin/posts/new" className="button button-primary">
          新建文章
        </Link>
      </div>

      <p className="admin-page-intro">{intro}</p>

      {user.role === "ADMIN" && reviewCount > 0 && selectedStatus !== PostStatus.IN_REVIEW ? (
        <div className="admin-empty-state">
          <strong>现在有 {reviewCount} 篇文章正在等审核</strong>
          <p>如果你现在要处理流程，直接去待审核状态或待审核队列会更快。</p>
          <div className="admin-list-actions">
            <Link href="/admin/posts?status=IN_REVIEW" className="button button-secondary">
              看待审核状态
            </Link>
            <Link href="/admin/review" className="button button-primary">
              去待审核队列
            </Link>
          </div>
        </div>
      ) : null}

      <div className="admin-filter-bar" aria-label="文章状态筛选">
        {statusFilters.map((filter) => {
          const isActive = filter.value === selectedStatus;
          const count = countMap[filter.value] ?? 0;

          return (
            <Link
              key={filter.value}
              href={buildStatusHref(filter.value)}
              className={`admin-filter-chip${isActive ? " is-active" : ""}`}
            >
              {filter.label} {count}
            </Link>
          );
        })}
      </div>

      {success ? <p className="admin-form-success">{success}</p> : null}
      {error ? <p className="admin-form-error">{error}</p> : null}

      {posts.length ? (
        <AdminPostsWorkbench
          posts={posts}
          userRole={user.role}
          selectedStatus={selectedStatus}
        />
      ) : (
        <div className="admin-empty-state">
          <strong>当前筛选下还没有文章</strong>
          <p>
            {selectedStatus === PostStatus.IN_REVIEW
              ? "这会儿没有内容在等你处理。等编辑提交新的文章，这里会自动出现。"
              : "可以先新建一篇，或者切换到别的状态看看已有内容。"}
          </p>
        </div>
      )}
    </section>
  );
}
