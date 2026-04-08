import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { getAllTags } from "../../lib/posts";

export const metadata = {
  title: "标签",
  description: "按标签整理这个站里写过的内容。",
};

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <main className="site-shell inner-page">
      <SiteHeader />

      <section className="page-hero">
        <p className="eyebrow">标签</p>
        <h1>如果你想顺着某个话题往下看，可以从这里开始。</h1>
        <p className="hero-lead">
          我会反复写到一些主题，比如做站、前端、写作和平台开发。这里把它们集中放在一起，找起来更快一点。
        </p>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">标签列表</p>
            <h2>标签总览</h2>
          </div>
          <p>想看哪一类内容，就直接点进去。</p>
        </div>

        <div className="tag-index-grid">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="tag-index-card"
            >
              <span className="tag-index-name">{tag}</span>
              <strong>{count}</strong>
              <span className="tag-index-meta">篇相关文章</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
