import Link from "next/link";
import { PostStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import {
  approveAdminPost,
  moveAdminPostToDraft,
  rejectAdminPost,
  submitAdminPostForReview,
  updateAdminPost,
} from "../../../actions";
import { getAuditLogs } from "../../../../../lib/audit-log";
import { requireRole, roleLabels } from "../../../../../lib/auth";
import {
  getPostReviewEvents,
  getReviewTransitionText,
  reviewActionLabels,
} from "../../../../../lib/post-review-history";
import {
  canApprove,
  canMoveToDraft,
  canReject,
  canSubmitForReview,
  getEditableStatusOptions,
  getMoveToDraftLabel,
  getRolePostGuidance,
  getSubmitReviewLabel,
  getWorkflowActionGuidance,
  postStatusLabels,
} from "../../../../../lib/post-workflow";
import { prisma } from "../../../../../lib/prisma";

export const metadata = {
  title: "编辑文章",
  description: "修改文章内容、状态和展示信息。",
};

const errorMap = {
  "missing-fields": "标题、摘要和正文都需要填写。",
  "slug-taken": "这个 slug 已经被占用了，换一个再试。",
  "missing-review-note": "驳回时请写一条说明，方便后面继续修改。",
};

const postFormats = [
  { value: "essay", label: "长文" },
  { value: "note", label: "短记" },
  { value: "tutorial", label: "指南" },
  { value: "field-log", label: "现场记录" },
];

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function renderWorkflowButton({
  action,
  postId,
  label,
  tone = "secondary",
}) {
  return (
    <form action={action}>
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className={`button ${tone === "primary" ? "button-primary" : "button-secondary"}`}
      >
        {label}
      </button>
    </form>
  );
}

export default async function AdminEditPostPage({ params, searchParams }) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const { postId } = await params;
  const query = await searchParams;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  if (user.role !== "ADMIN" && post.authorId !== user.id) {
    notFound();
  }

  const error = errorMap[query?.error] ?? null;
  const [logs, reviewEvents] = await Promise.all([
    getAuditLogs({
      limit: 8,
      targetType: "post",
      targetId: post.id,
    }),
    getPostReviewEvents(post.id, 12),
  ]);
  const statusOptions = getEditableStatusOptions(user.role);
  const roleGuidance = getRolePostGuidance(user.role);
  const workflowGuidance = getWorkflowActionGuidance(user.role, post.status);
  const defaultStatus = statusOptions.some((option) => option.value === post.status)
    ? post.status
    : user.role === "ADMIN"
      ? PostStatus.DRAFT
      : PostStatus.IN_REVIEW;

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">编辑文章</p>
          <h2>改内容，也看清楚这篇文章现在在哪一步</h2>
        </div>
        <p>
          当前作者：{post.author.name} / 当前登录身份：{roleLabels[user.role]}
        </p>
      </div>

      <p className="admin-page-intro">{roleGuidance.editor}</p>

      <section className="admin-workflow-panel">
        <div className="admin-workflow-panel-copy">
          <p className="eyebrow">下一步</p>
          <h3>{workflowGuidance.title}</h3>
          <p>{workflowGuidance.description}</p>
        </div>
        {user.role === "ADMIN" && canApprove(post.status) ? (
          <div className="admin-workflow-action-groups">
            <div className="admin-workflow-primary">
              <span className="admin-workflow-kicker">主动作</span>
              {renderWorkflowButton({
                action: approveAdminPost,
                postId: post.id,
                label: "通过并发布",
                tone: "primary",
              })}
            </div>
            <div className="admin-workflow-secondary">
              <span className="admin-workflow-kicker">其他处理</span>
              <div className="admin-workflow-actions">
                {renderWorkflowButton({
                  action: moveAdminPostToDraft,
                  postId: post.id,
                  label: getMoveToDraftLabel(user.role, post.status),
                })}
              </div>
            </div>
          </div>
        ) : null}

        {!(user.role === "ADMIN" && canApprove(post.status)) && canSubmitForReview(post.status) ? (
          <div className="admin-workflow-action-groups">
            <div className="admin-workflow-primary">
              <span className="admin-workflow-kicker">主动作</span>
              {renderWorkflowButton({
                action: submitAdminPostForReview,
                postId: post.id,
                label: getSubmitReviewLabel(post.status),
                tone: "primary",
              })}
            </div>
            {canMoveToDraft(user.role, post.status) ? (
              <div className="admin-workflow-secondary">
                <span className="admin-workflow-kicker">其他处理</span>
                <div className="admin-workflow-actions">
                  {renderWorkflowButton({
                    action: moveAdminPostToDraft,
                    postId: post.id,
                    label: getMoveToDraftLabel(user.role, post.status),
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!(user.role === "ADMIN" && canApprove(post.status)) &&
        !canSubmitForReview(post.status) &&
        canMoveToDraft(user.role, post.status) ? (
          <div className="admin-workflow-action-groups">
            <div className="admin-workflow-primary">
              <span className="admin-workflow-kicker">主动作</span>
              {renderWorkflowButton({
                action: moveAdminPostToDraft,
                postId: post.id,
                label: getMoveToDraftLabel(user.role, post.status),
                tone: "primary",
              })}
            </div>
          </div>
        ) : null}
      </section>

      <div className="admin-inline-note">
        <span>文章 ID：{post.id}</span>
        <span>Slug：{post.slug}</span>
        <span>当前状态：{postStatusLabels[post.status]}</span>
        {post.status === "PUBLISHED" ? (
          <Link href={`/posts/${post.slug}`} className="post-link">
            查看公开页
          </Link>
        ) : (
          <span>当前还没有公开页</span>
        )}
      </div>

      {post.reviewNote ? (
        <p className="admin-form-error">最近一次驳回说明：{post.reviewNote}</p>
      ) : null}

      {user.role !== "ADMIN" && post.status === "PUBLISHED" ? (
        <p className="admin-form-error">
          这篇文章已经发布。你现在继续修改并保存的话，它会先退出公开页，再重新进入审核流程。
        </p>
      ) : null}

      {error ? <p className="admin-form-error">{error}</p> : null}

      <form action={updateAdminPost} className="admin-form">
        <input type="hidden" name="postId" value={post.id} />

        <label className="admin-field">
          <span>标题</span>
          <input type="text" name="title" defaultValue={post.title} required />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input type="text" name="slug" defaultValue={post.slug} />
        </label>

        <label className="admin-field">
          <span>摘要</span>
          <textarea name="summary" rows="3" defaultValue={post.summary} required />
        </label>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>内容形态</span>
            <select name="format" defaultValue={post.format}>
              {postFormats.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>标签</span>
            <input type="text" name="tagsText" defaultValue={post.tagsText} />
          </label>

          <label className="admin-field">
            <span>系列</span>
            <input type="text" name="series" defaultValue={post.series ?? ""} />
          </label>

          <label className="admin-field">
            <span>语气</span>
            <input type="text" name="mood" defaultValue={post.mood ?? ""} />
          </label>
        </div>

        <label className="admin-field">
          <span>正文</span>
          <textarea name="content" rows="14" defaultValue={post.content} required />
        </label>

        <label className="admin-field">
          <span>亮点摘要</span>
          <textarea
            name="highlightsText"
            rows="4"
            defaultValue={post.highlightsText}
          />
        </label>

        <label className="admin-field">
          <span>封面图</span>
          <input type="text" name="cover" defaultValue={post.cover ?? ""} />
        </label>

        <div className="admin-form-inline">
          <label className="admin-field">
            <span>状态</span>
            <select name="status" defaultValue={defaultStatus}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={post.featured}
            />
            <span>标记为首页重点内容</span>
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="button button-primary">
            保存修改
          </button>
          <Link href="/admin/posts" className="button button-secondary">
            返回文章列表
          </Link>
        </div>
      </form>

      {user.role === "ADMIN" && canReject(post.status) ? (
        <section className="admin-workflow-panel admin-workflow-panel-muted">
          <div className="admin-workflow-panel-copy">
            <p className="eyebrow">次动作</p>
            <h3>如果这次不能过，就把原因说清楚</h3>
            <p>驳回是次级流程动作。只有确认现在不能公开时，才把它退回给编辑继续改。</p>
          </div>
          <form action={rejectAdminPost} className="admin-form">
            <input type="hidden" name="postId" value={post.id} />
            <label className="admin-field">
              <span>驳回说明</span>
              <textarea
                name="reviewNote"
                rows="4"
                placeholder="告诉编辑这次为什么没通过，以及下一步需要改什么。"
                required
              />
            </label>

            <div className="admin-form-actions">
              <button type="submit" className="button button-secondary">
                驳回这篇文章
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {reviewEvents.length ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">审核历程</p>
              <h2>这篇文章是怎么一步步流转到现在的</h2>
            </div>
            <p>这里单独记录审核节点，和通用操作日志分开看会更清楚。</p>
          </div>

          <div className="admin-review-history">
            {reviewEvents.map((event) => (
              <article key={event.id} className="admin-review-card">
                <div className="admin-review-card-top">
                  <div className="admin-log-tags">
                    <span className="admin-log-chip">
                      {reviewActionLabels[event.action] ?? event.action}
                    </span>
                    <span className="admin-log-chip admin-log-chip-muted">
                      {getReviewTransitionText(event)}
                    </span>
                  </div>
                  <time dateTime={event.createdAt.toISOString()}>
                    {formatDateTime(event.createdAt)}
                  </time>
                </div>
                <strong>{event.actor?.name ?? "系统"}</strong>
                {event.note ? <p>{event.note}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {logs.length ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">操作记录</p>
              <h2>这篇文章最近还有哪些后台动作</h2>
            </div>
          </div>

          <div className="admin-log-list">
            {logs.map((log) => (
              <article key={log.id} className="admin-log-card">
                <div className="admin-log-main">
                  <strong>{log.summary}</strong>
                  <span>{log.actor?.name ?? "系统"}</span>
                </div>
                <time dateTime={log.createdAt.toISOString()}>
                  {formatDateTime(log.createdAt)}
                </time>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
