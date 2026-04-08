import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { getArchiveGroups } from "../../lib/posts";

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export const metadata = {
  title: "归档",
  description: "按时间翻看这个站里写过的内容。",
};

export default async function ArchivePage() {
  const groups = await getArchiveGroups();

  return (
    <main className="site-shell inner-page">
      <SiteHeader />

      <section className="page-hero">
        <p className="eyebrow">归档</p>
        <h1>如果你想按时间看我都写了什么，可以从这里翻。</h1>
        <p className="hero-lead">
          我把公开内容按月份排在一起。它更像一份日志，能看出这个站是怎么一点点积累起来的。
        </p>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">按时间看</p>
            <h2>时间归档</h2>
          </div>
          <p>从最近的月份开始往回看，会比较容易找到最近在写什么。</p>
        </div>

        <div className="archive-stack">
          {groups.map((group) => (
            <section key={group.key} className="archive-group">
              <div className="archive-heading">
                <div>
                  <h3>{group.label}</h3>
                  <p>{group.count} 篇内容</p>
                </div>
              </div>

              <div className="archive-list">
                {group.posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    className="archive-item"
                  >
                    <div>
                      <span className="archive-date">{formatDate(post.date)}</span>
                      <h4>{post.title}</h4>
                      <p>{post.summary}</p>
                    </div>
                    <span className="archive-format">{post.formatLabel}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
