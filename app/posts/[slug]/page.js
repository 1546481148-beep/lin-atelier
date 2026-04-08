import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadingModeControls } from "../../../components/reading-mode-controls";
import { SiteHeader } from "../../../components/site-header";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
} from "../../../lib/posts";

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const post = await getPostBySlug(slug);
    return {
      title: post.title,
      description: post.summary,
      openGraph: {
        title: post.title,
        description: post.summary,
        type: "article",
      },
    };
  } catch {
    return {
      title: "文章不存在",
    };
  }
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const articleReaderId = `article-reader-${slug}`;

  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug, 3);

  return (
    <main className="site-shell inner-page">
      <SiteHeader />

      <ReadingModeControls targetId={articleReaderId} />

      <article className="article-shell">
        <div className="article-header">
          <Link href="/" className="article-backlink">
            返回首页
          </Link>
          <p className="eyebrow">
            {post.formatLabel} / {formatDate(post.date)}
          </p>
          <h1>{post.title}</h1>
          <p className="article-summary">{post.summary}</p>
          <div className="article-meta-grid">
            <div>
              <span>阅读时间</span>
              <strong>{post.readingTime} 分钟</strong>
            </div>
            <div>
              <span>内容形态</span>
              <strong>{post.formatLabel}</strong>
            </div>
            <div>
              <span>系列</span>
              <strong>{post.series ?? "独立文章"}</strong>
            </div>
            <div>
              <span>语气</span>
              <strong>{post.mood ?? "清晰、克制、开放"}</strong>
            </div>
            {post.authorName ? (
              <div>
                <span>作者</span>
                <strong>{post.authorName}</strong>
              </div>
            ) : null}
            {post.source === "database" ? (
              <div>
                <span>发布来源</span>
                <strong>后台发布</strong>
              </div>
            ) : null}
          </div>
          {post.highlights.length ? (
            <div className="highlight-panel">
              <p className="signal-label">这篇先看这些</p>
              <ul className="highlight-list">
                {post.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {post.tags.length ? (
            <div className="tag-list" aria-label="文章标签">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="tag-link-pill"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
          {post.cover ? (
            <img
              className="article-cover"
              src={post.cover}
              alt={`${post.title} 的封面图`}
            />
          ) : null}
        </div>

        <div
          id={articleReaderId}
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>

      {relatedPosts.length ? (
        <section className="content-section related-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">继续看</p>
              <h2>继续阅读</h2>
            </div>
            <p>如果你还想继续看，我把几篇更接近的内容放在下面了。</p>
          </div>

          <div className="post-grid">
            {relatedPosts.map((relatedPost) => (
              <article key={relatedPost.slug} className="post-card">
                <div className="post-card-shell">
                  <div className="post-card-meta">
                    <span>{relatedPost.formatLabel}</span>
                    <span>{formatDate(relatedPost.date)}</span>
                  </div>
                  <h3>{relatedPost.title}</h3>
                  <p>{relatedPost.summary}</p>
                  <Link
                    href={`/posts/${relatedPost.slug}`}
                    className="post-link"
                  >
                    阅读下一篇
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
