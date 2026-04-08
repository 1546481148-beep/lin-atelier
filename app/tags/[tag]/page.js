import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../../components/site-header";
import { getAllTags, getPostsByTag } from "../../../lib/posts";

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag }));
}

export async function generateMetadata({ params }) {
  const { tag } = await params;
  return {
    title: `标签：${tag}`,
    description: `查看和“${tag}”相关的所有文章。`,
  };
}

export default async function TagDetailPage({ params }) {
  const { tag } = await params;
  const posts = await getPostsByTag(tag);

  if (!posts.length) {
    notFound();
  }

  return (
    <main className="site-shell inner-page">
      <SiteHeader />

      <section className="page-hero">
        <p className="eyebrow">按标签查看</p>
        <h1>#{tag}</h1>
        <p className="hero-lead">
          这里是和“{tag}”有关的内容。我把它们放在一起，方便顺着一个主题继续看。
        </p>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">相关文章</p>
            <h2>{posts.length} 篇相关内容</h2>
          </div>
          <p>默认按时间倒序排，最近写的会在前面。</p>
        </div>

        <div className="post-grid">
          {posts.map((post) => (
            <article key={post.slug} className="post-card">
              <div className="post-card-shell">
                <div className="post-card-meta">
                  <span>{post.formatLabel}</span>
                  <span>{formatDate(post.date)}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <div className="tag-list compact-tag-list" aria-label="文章标签">
                  {post.tags.map((item) => (
                    <Link
                      key={item}
                      href={`/tags/${encodeURIComponent(item)}`}
                      className="tag-link-pill"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
                <Link href={`/posts/${post.slug}`} className="post-link">
                  阅读全文
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
