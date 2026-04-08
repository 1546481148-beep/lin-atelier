import Link from "next/link";
import { PostStatus } from "@prisma/client";
import { getAuditLogs } from "../../../lib/audit-log";
import { requireSessionUser, roleLabels } from "../../../lib/auth";
import { postStatusLabels } from "../../../lib/post-workflow";
import { prisma } from "../../../lib/prisma";

export const metadata = {
  title: "后台概览",
  description: "查看当前后台里的文章、用户和发布情况。",
};

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function AdminDashboardPage() {
  const user = await requireSessionUser();

  const postWhere = user.role === "ADMIN" ? {} : { authorId: user.id };
  const [draftCount, reviewCount, publishedCount, recentPosts, recentLogs] = await Promise.all([
    prisma.post.count({ where: { ...postWhere, status: PostStatus.DRAFT } }),
    prisma.post.count({ where: { ...postWhere, status: PostStatus.IN_REVIEW } }),
    prisma.post.count({ where: { ...postWhere, status: PostStatus.PUBLISHED } }),
    prisma.post.findMany({
      where: postWhere,
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    }),
    user.role === "READER"
      ? Promise.resolve([])
      : getAuditLogs({
          limit: 5,
          actorId: user.role === "ADMIN" ? undefined : user.id,
        }),
  ]);

  return (
    <div className="admin-page-stack">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">概览</p>
            <h2>先看一下现在这个后台里有什么</h2>
          </div>
          <p>这里先放最常用的数字和最近更新，方便进来之后快速知道当前是什么状态。</p>
        </div>

        <div className="admin-stat-grid">
          <article className="admin-stat-card">
            <span>当前角色</span>
            <strong>{roleLabels[user.role]}</strong>
          </article>
          <article className="admin-stat-card">
            <span>草稿文章</span>
            <strong>{draftCount}</strong>
          </article>
          <article className="admin-stat-card">
            <span>待审核文章</span>
            <strong>{reviewCount}</strong>
          </article>
          <article className="admin-stat-card">
            <span>已发布文章</span>
            <strong>{publishedCount}</strong>
          </article>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">最近更新</p>
            <h2>最近内容</h2>
          </div>
          <Link href="/admin/posts" className="post-link">
            去文章管理
          </Link>
        </div>

        <div className="admin-list">
          {recentPosts.map((post) => (
            <article key={post.id} className="admin-list-card">
              <div>
                <p className="signal-label">{postStatusLabels[post.status]}</p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
              </div>
              <div className="admin-list-meta">
                <span>作者：{post.author.name}</span>
                <span>地址：{post.slug}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {recentLogs.length ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">最近操作</p>
              <h2>{user.role === "ADMIN" ? "后台最近做了什么" : "你最近做过什么"}</h2>
            </div>
            {user.role === "ADMIN" ? (
              <Link href="/admin/logs" className="post-link">
                查看全部日志
              </Link>
            ) : null}
          </div>

          <div className="admin-log-list">
            {recentLogs.map((log) => (
              <article key={log.id} className="admin-log-card">
                <div className="admin-log-main">
                  <strong>{log.summary}</strong>
                  <span>{log.actor?.name ?? "系统"} / {log.targetLabel}</span>
                </div>
                <time dateTime={log.createdAt.toISOString()}>
                  {formatDateTime(log.createdAt)}
                </time>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">权限</p>
            <h2>现在这几个角色分别能做什么</h2>
          </div>
        </div>

        <div className="admin-role-grid">
          <article className="admin-role-card">
            <strong>管理员</strong>
            <p>可以看全部内容，也能管理用户和角色。</p>
          </article>
          <article className="admin-role-card">
            <strong>编辑</strong>
            <p>可以写文章、改文章，主要负责自己的内容。</p>
          </article>
          <article className="admin-role-card">
            <strong>读者</strong>
            <p>保留登录身份，但不会进入文章管理和用户管理页。</p>
          </article>
        </div>
      </section>
    </div>
  );
}
