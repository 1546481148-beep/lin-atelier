import Link from "next/link";
import { IncomingLinkStatus } from "@prisma/client";
import {
  createIncomingLinkManually,
  retryIncomingLinkParse,
  simulateFailedIncomingLink,
  simulateGithubIncomingLink,
} from "../../actions";
import { requireRole } from "../../../../lib/auth";
import { withAdminDbFallback, prisma } from "../../../../lib/admin-db";

export const metadata = {
  title: "链接接收",
  description: "接收外部平台推送的 URL，解析后展示在后台。",
};

const statusLabels = {
  [IncomingLinkStatus.PENDING]: "等待处理",
  [IncomingLinkStatus.READY]: "已解析",
  [IncomingLinkStatus.FAILED]: "解析失败",
};

const attemptActionLabels = {
  RECEIVED: "系统接收",
  MANUAL_SUBMIT: "手动提交",
  RETRIED: "重新解析",
  FAILED_SAMPLE: "失败样本",
};

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function IncomingLinksPage({ searchParams }) {
  await requireRole(["ADMIN", "EDITOR"]);
  const params = await searchParams;
  const selectedStatus = String(params?.status ?? "").trim();
  const success = String(params?.success ?? "").trim();
  const error = String(params?.error ?? "").trim();
  const where = selectedStatus ? { status: selectedStatus } : {};

  const { links, statusCountMap, totalCount, dbAvailable } = await withAdminDbFallback(
    async () => {
      const [links, counts] = await Promise.all([
        prisma.incomingLink.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: 30,
          include: {
            actor: {
              select: {
                name: true,
              },
            },
            attempts: {
              orderBy: { createdAt: "desc" },
              take: 5,
              include: {
                actor: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.incomingLink.groupBy({
          by: ["status"],
          _count: {
            _all: true,
          },
        }),
      ]);

      const statusCountMap = counts.reduce(
        (result, item) => ({ ...result, [item.status]: item._count._all }),
        {},
      );

      return {
        links,
        statusCountMap,
        totalCount: Object.values(statusCountMap).reduce((sum, value) => sum + value, 0),
        dbAvailable: true,
      };
    },
    {
      links: [],
      statusCountMap: {},
      totalCount: 0,
      dbAvailable: false,
    },
  );

  return (
    <div className="admin-page-stack">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">链接接收</p>
            <h2>接收外部平台推送的 URL，再把解析结果展示到前端</h2>
          </div>
          <p>
            这一页对应的平台链路是：接收请求，提取 URL，抓取页面元数据，存进数据库，再给前端列表读取。
          </p>
        </div>

        {!dbAvailable ? (
          <p className="admin-flash admin-flash-error">
            当前数据库暂时连不上，所以列表还取不到数据。你仍然可以先看接口结构和手动测试入口。
          </p>
        ) : null}

        {success === "link-received" ? (
          <p className="admin-flash admin-flash-success">
            链接已经接收并进入解析流程了。
          </p>
        ) : null}

        {success === "github-simulated" ? (
          <p className="admin-flash admin-flash-success">
            已经模拟了一次 GitHub 推送。你现在往下看结果列表，就能看到新记录。
          </p>
        ) : null}

        {success === "failed-sample-created" ? (
          <p className="admin-flash admin-flash-success">
            已经生成了一条失败样本。你现在切到“解析失败”就能练习重新解析。
          </p>
        ) : null}

        {success === "link-retried" ? (
          <p className="admin-flash admin-flash-success">
            这条链接已经重新解析过了。你可以看下面的状态和最后处理时间有没有变化。
          </p>
        ) : null}

        {error ? (
          <p className="admin-flash admin-flash-error">
            处理失败：{decodeURIComponent(error)}
          </p>
        ) : null}

        <div className="admin-guide-grid">
          <article className="admin-guide-card">
            <p className="signal-label">接口地址</p>
            <h3>POST /api/incoming/url</h3>
            <p>真实平台可以往这个地址推送 JSON。当前最小字段只需要一个 `url`。</p>
            <pre className="admin-code-block">
{`POST /api/incoming/url
Content-Type: application/json

{
  "sourcePlatform": "github",
  "url": "https://example.com/article"
}`}
            </pre>
            <p className="admin-guide-note">
              如果你配置了 `INCOMING_WEBHOOK_TOKEN`，请求时还需要带上 `x-incoming-token`。
            </p>
          </article>

          <article className="admin-guide-card">
            <p className="signal-label">GitHub 接入</p>
            <h3>把 issue、PR 或评论里的 URL 推到这里</h3>
            <p>
              GitHub webhook 可以直接指向 <code>/api/incoming/github</code>。当前支持从
              issue、PR、评论、review、release 和 commit message 里提取 URL。
            </p>
            <pre className="admin-code-block">
{`Payload URL: /api/incoming/github
Content type: application/json
Secret: GITHUB_WEBHOOK_SECRET

Recommended events:
- Issues
- Issue comments
- Pull requests
- Pull request reviews
- Releases
- Pushes`}
            </pre>
            <p className="admin-guide-note">
              只要正文里出现 http 或 https 链接，系统就会自动抽出 URL，解析标题和摘要，再写进下面的结果列表。
            </p>
            <form action={simulateGithubIncomingLink}>
              <button type="submit" className="button button-secondary">
                一键模拟 GitHub 推送
              </button>
            </form>
          </article>

          <article className="admin-guide-card">
            <p className="signal-label">手动测试</p>
            <h3>先从后台手动发一条 URL 进来</h3>
            <form action={createIncomingLinkManually} className="admin-inline-form">
              <label>
                来源平台
                <input
                  type="text"
                  name="sourcePlatform"
                  defaultValue="manual"
                  placeholder="manual / github / feishu"
                />
              </label>
              <label>
                URL
                <input
                  type="url"
                  name="url"
                  placeholder="https://example.com/article"
                  required
                />
              </label>
              <button type="submit" className="button button-primary">
                提交并解析
              </button>
            </form>
            <pre className="admin-code-block">
{`curl -X POST http://localhost:3001/api/incoming/github \\
  -H "Content-Type: application/json" \\
  -H "x-github-event: issue_comment" \\
  -d '{
    "action": "created",
    "comment": {
      "body": "Please collect this link: https://example.com"
    },
    "sender": {
      "login": "demo-user"
    },
    "repository": {
      "full_name": "demo/repo"
    }
  }'`}
            </pre>
            <form action={simulateFailedIncomingLink}>
              <button type="submit" className="button button-secondary">
                一键生成失败样本
              </button>
            </form>
          </article>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">结果列表</p>
            <h2>最近收到的外部链接</h2>
          </div>
          <div className="admin-filter-row">
            <Link href="/admin/incoming-links" className={!selectedStatus ? "is-active" : ""}>
              全部 {totalCount}
            </Link>
            {Object.values(IncomingLinkStatus).map((status) => (
              <Link
                key={status}
                href={`/admin/incoming-links?status=${status}`}
                className={selectedStatus === status ? "is-active" : ""}
              >
                {statusLabels[status]} {statusCountMap[status] ?? 0}
              </Link>
            ))}
          </div>
        </div>

        <div className="admin-list">
          {links.length ? (
            links.map((link) => (
              <article key={link.id} className="admin-list-card">
                <div className="admin-list-main">
                  <div className="admin-list-heading">
                    <p className="signal-label">
                      {link.sourcePlatform} / {statusLabels[link.status]}
                    </p>
                    <h3>{link.title || link.originalUrl}</h3>
                  </div>
                  {link.summary ? <p>{link.summary}</p> : null}
                  <div className="admin-link-meta">
                    <span>域名：{link.hostname}</span>
                    <span>接收时间：{formatDateTime(link.createdAt)}</span>
                    <span>最后处理：{formatDateTime(link.updatedAt)}</span>
                    {link.actor?.name ? <span>提交人：{link.actor.name}</span> : null}
                  </div>
                  <div className="admin-link-actions">
                    <a href={link.originalUrl} target="_blank" rel="noreferrer" className="post-link">
                      打开原链接
                    </a>
                    {link.coverImage ? (
                      <a href={link.coverImage} target="_blank" rel="noreferrer" className="post-link">
                        查看封面
                      </a>
                    ) : null}
                    {link.status === IncomingLinkStatus.FAILED ? (
                      <form action={retryIncomingLinkParse}>
                        <input type="hidden" name="incomingLinkId" value={link.id} />
                        <button type="submit" className="button button-secondary">
                          重新解析
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {link.errorMessage ? (
                    <p className="admin-guide-note">错误信息：{link.errorMessage}</p>
                  ) : null}
                  {link.attempts?.length ? (
                    <div className="admin-guide-note">
                      <strong>处理历史</strong>
                      {link.attempts.map((attempt) => (
                        <p key={attempt.id}>
                          {formatDateTime(attempt.createdAt)} /{" "}
                          {attemptActionLabels[attempt.action] ?? attempt.action} /{" "}
                          {statusLabels[attempt.status]}
                          {attempt.actor?.name ? ` / ${attempt.actor.name}` : ""}
                          {attempt.message ? ` / ${attempt.message}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <article className="admin-list-card">
              <div className="admin-list-main">
                <p className="signal-label">还没有数据</p>
                <h3>先从上面的手动测试开始</h3>
                <p>只要推一个 URL 进来，这里就会显示解析后的标题、摘要和封面。</p>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
