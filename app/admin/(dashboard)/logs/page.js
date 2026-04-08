import Link from "next/link";
import {
  auditActionLabels,
  auditTargetLabels,
  getAuditLogOverview,
  getAuditLogs,
} from "../../../../lib/audit-log";
import { requireRole } from "../../../../lib/auth";

export const metadata = {
  title: "操作日志",
  description: "查看后台最近发生的关键操作。",
};

const scopeOptions = [
  { value: "all", label: "全部" },
  { value: "post", label: "内容" },
  { value: "user", label: "用户" },
  { value: "account", label: "账户" },
];

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function buildScopeHref(scope) {
  return scope === "all" ? "/admin/logs" : `/admin/logs?scope=${scope}`;
}

export default async function AdminLogsPage({ searchParams }) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const scope =
    typeof params?.scope === "string" &&
    scopeOptions.some((item) => item.value === params.scope)
      ? params.scope
      : "all";
  const targetType = scope === "all" ? undefined : scope;

  const [logs, overview] = await Promise.all([
    getAuditLogs({ limit: 40, targetType }),
    getAuditLogOverview(),
  ]);

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">操作日志</p>
          <h2>后台最近发生了什么</h2>
        </div>
        <p>
          日志页不是为了“看起来专业”，而是为了在内容和用户越来越多时，还能回头查清楚谁改了什么。
        </p>
      </div>

      <div className="admin-stat-grid admin-log-stat-grid">
        <article className="admin-stat-card">
          <span>全部记录</span>
          <strong>{overview.total}</strong>
        </article>
        <article className="admin-stat-card">
          <span>内容操作</span>
          <strong>{overview.postCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span>用户操作</span>
          <strong>{overview.userCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span>账户操作</span>
          <strong>{overview.accountCount}</strong>
        </article>
      </div>

      <div className="admin-filter-bar" aria-label="日志筛选">
        {scopeOptions.map((option) => {
          const isActive = option.value === scope;

          return (
            <Link
              key={option.value}
              href={buildScopeHref(option.value)}
              className={`admin-filter-chip${isActive ? " is-active" : ""}`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {logs.length ? (
        <div className="admin-log-list">
          {logs.map((log) => (
            <article key={log.id} className="admin-log-card">
              <div className="admin-log-main">
                <div className="admin-log-tags">
                  <span className="admin-log-chip">
                    {auditTargetLabels[log.targetType] ?? log.targetType}
                  </span>
                  <span className="admin-log-chip admin-log-chip-muted">
                    {auditActionLabels[log.action] ?? log.action}
                  </span>
                </div>
                <strong>{log.summary}</strong>
                <span>
                  {log.actor?.name ?? "系统"} · {log.targetLabel}
                </span>
              </div>
              <time dateTime={log.createdAt.toISOString()}>
                {formatDateTime(log.createdAt)}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>这个分类下还没有记录</strong>
          <p>等你继续操作内容、用户或账户之后，这里会自动补上对应的历史。</p>
        </div>
      )}
    </section>
  );
}
