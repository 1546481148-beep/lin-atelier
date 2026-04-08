"use client";

import { useState } from "react";
import Link from "next/link";
import { PostStatus } from "@prisma/client";
import {
  approveAdminPost,
  moveAdminPostToDraft,
  runBulkAdminPostAction,
  submitAdminPostForReview,
} from "../app/admin/actions";
import {
  canApprove,
  canMoveToDraft,
  canSubmitForReview,
  getMoveToDraftLabel,
  getSubmitReviewLabel,
  postStatusLabels,
} from "../lib/post-workflow";

function renderActionButton({ action, postId, label, tone = "secondary" }) {
  return (
    <form action={action}>
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className={`button ${tone === "primary" ? "button-primary" : "button-secondary"} admin-list-button`}
      >
        {label}
      </button>
    </form>
  );
}

export default function AdminPostsWorkbench({
  posts,
  userRole,
  selectedStatus,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelected = posts.length > 0 && selectedIds.length === posts.length;

  function togglePost(postId) {
    setSelectedIds((current) =>
      current.includes(postId)
        ? current.filter((item) => item !== postId)
        : [...current, postId],
    );
  }

  function selectAll() {
    setSelectedIds(posts.map((post) => post.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  return (
    <>
      <form
        action={runBulkAdminPostAction}
        id="bulk-post-actions"
        className="admin-bulk-toolbar"
      >
        <input
          type="hidden"
          name="currentStatus"
          value={selectedStatus === "all" ? "" : selectedStatus}
        />
        {selectedIds.map((postId) => (
          <input key={postId} type="hidden" name="postIds" value={postId} />
        ))}
        <div className="admin-bulk-toolbar-copy">
          <strong>批量处理</strong>
          <span>先选文章，再一起提交审核、转回草稿，或批量通过发布。</span>
        </div>
        <div className="admin-bulk-toolbar-meta">
          <strong>已选 {selectedIds.length} 篇</strong>
          <div className="admin-bulk-toolbar-selection">
            <button
              type="button"
              className="button button-secondary"
              onClick={allSelected ? clearSelection : selectAll}
            >
              {allSelected ? "取消全选" : "全选当前页"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={clearSelection}
              disabled={!selectedIds.length}
            >
              清空选择
            </button>
          </div>
        </div>
        <div className="admin-bulk-toolbar-actions">
          <button
            type="submit"
            name="bulkAction"
            value="submit"
            className="button button-secondary"
            disabled={!selectedIds.length}
          >
            批量提交审核
          </button>
          {userRole === "ADMIN" ? (
            <button
              type="submit"
              name="bulkAction"
              value="approve"
              className="button button-primary"
              disabled={!selectedIds.length}
            >
              批量通过发布
            </button>
          ) : null}
          <button
            type="submit"
            name="bulkAction"
            value="draft"
            className="button button-secondary"
            disabled={!selectedIds.length}
          >
            批量转回草稿
          </button>
        </div>
      </form>

      <div className="admin-list">
        {posts.map((post) => {
          const isSelected = selectedIds.includes(post.id);

          return (
            <article key={post.id} className="admin-list-card">
              <div className="admin-list-select">
                <label className={`admin-select-card${isSelected ? " is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePost(post.id)}
                  />
                  <span>加入批量处理</span>
                </label>
              </div>
              <div className="admin-list-main">
                <p className="signal-label">{postStatusLabels[post.status]}</p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                {post.reviewNote ? (
                  <p className="admin-review-note">驳回说明：{post.reviewNote}</p>
                ) : null}
              </div>
              <div className="admin-list-meta">
                <span>作者：{post.author.name}</span>
                <span>邮箱：{post.author.email}</span>
                <span>Slug：{post.slug}</span>
                <span>形态：{post.format}</span>
                <span>标签：{post.tagsText || "还没有写标签"}</span>
                <div className="admin-list-workflow">
                  {userRole === "ADMIN" && canApprove(post.status) ? (
                    <>
                      <div className="admin-list-primary-action">
                        <span className="admin-workflow-kicker">主动作</span>
                        {renderActionButton({
                          action: approveAdminPost,
                          postId: post.id,
                          label: "通过发布",
                          tone: "primary",
                        })}
                      </div>
                      <div className="admin-list-secondary-actions">
                        <span className="admin-workflow-kicker">其他处理</span>
                        <div className="admin-list-actions">
                          <Link
                            href={`/admin/posts/${post.id}`}
                            className="button button-secondary admin-list-button"
                          >
                            去审核
                          </Link>
                          {canMoveToDraft(userRole, post.status)
                            ? renderActionButton({
                                action: moveAdminPostToDraft,
                                postId: post.id,
                                label: getMoveToDraftLabel(userRole, post.status),
                              })
                            : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="admin-list-primary-action">
                        <span className="admin-workflow-kicker">主动作</span>
                        {canSubmitForReview(post.status)
                          ? renderActionButton({
                              action: submitAdminPostForReview,
                              postId: post.id,
                              label: getSubmitReviewLabel(post.status),
                              tone: "primary",
                            })
                          : canMoveToDraft(userRole, post.status)
                            ? renderActionButton({
                                action: moveAdminPostToDraft,
                                postId: post.id,
                                label: getMoveToDraftLabel(userRole, post.status),
                                tone: "primary",
                              })
                            : (
                              <Link
                                href={`/admin/posts/${post.id}`}
                                className="button button-primary admin-list-button"
                              >
                                编辑内容
                              </Link>
                            )}
                      </div>
                      <div className="admin-list-secondary-actions">
                        <span className="admin-workflow-kicker">其他处理</span>
                        <div className="admin-list-actions">
                          <Link
                            href={`/admin/posts/${post.id}`}
                            className="button button-secondary admin-list-button"
                          >
                            编辑
                          </Link>
                          {!canSubmitForReview(post.status) &&
                          canMoveToDraft(userRole, post.status)
                            ? null
                            : canMoveToDraft(userRole, post.status)
                              ? renderActionButton({
                                  action: moveAdminPostToDraft,
                                  postId: post.id,
                                  label: getMoveToDraftLabel(userRole, post.status),
                                })
                              : null}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
