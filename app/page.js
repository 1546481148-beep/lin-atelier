import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { getAllPosts, getFormatSummary } from "../lib/posts";

export const metadata = {
  title: "首页",
  description: "Lin's Atelier 的首页，记录最近写的文章、笔记和项目过程。",
};

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export default async function HomePage() {
  const posts = await getAllPosts();
  const featuredPost = posts.find((post) => post.featured) ?? posts[0];
  const spotlightPosts = posts.filter((post) => post.slug !== featuredPost?.slug);
  const writingTracks = await getFormatSummary(posts);
  const notebookPosts = posts
    .filter((post) => post.format === "note" || post.format === "field-log")
    .slice(0, 3);
  const guidePosts = posts
    .filter((post) => post.format === "tutorial")
    .slice(0, 2);
  const tagCloud = [...new Set(posts.flatMap((post) => post.tags))].slice(0, 10);
  const recentPosts = posts.slice(0, 4);
  const quickTags = tagCloud.slice(0, 6);

  return (
    <main className="site-shell">
      <div className="hero-backdrop hero-backdrop-left" />
      <div className="hero-backdrop hero-backdrop-right" />

      <SiteHeader />

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">个人博客 / 持续更新</p>
          <h1>这里写我最近在做的事，也记录这个站怎么一点点长出来。</h1>
          <p className="hero-lead">
            我不太想把这里做成只摆结果的地方，所以除了长文，也会放一些短笔记、清单和做站时的记录。先写下来，比一次写得很完整更重要。
          </p>

          <div className="hero-actions">
            {featuredPost ? (
              <Link
                href={`/posts/${featuredPost.slug}`}
                className="button button-secondary"
              >
                先看这篇
              </Link>
            ) : null}
            <Link href="/about" className="button button-primary">
              关于我
            </Link>
          </div>

          <div className="hero-stats" aria-label="博客亮点">
            <div>
              <strong>{posts.length}</strong>
              <span>已发布内容</span>
            </div>
            <div>
              <strong>{writingTracks.length}</strong>
              <span>写作类型</span>
            </div>
            <div>
              <strong>{tagCloud.length}</strong>
              <span>常写标签</span>
            </div>
          </div>

          {quickTags.length ? (
            <div className="hero-quick-tags" aria-label="常写标签">
              {quickTags.map((tag) => (
                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="hero-panel">
          <div className="signal-card">
            <p className="signal-label">最近在做的事</p>
            <h2>我最近主要在做两件事：继续写东西，以及把这个站慢慢补完整。</h2>
            <p>
              前台已经能看到后台发布的文章，所以这里一边是内容，一边也顺手留下做站过程。它更像一个长期在用的地方，不是专门拿来展示的页面。
            </p>
          </div>
          {featuredPost ? (
            <article className="featured-card">
              <p className="signal-label">推荐阅读</p>
              <div className="format-chip">{featuredPost.formatLabel}</div>
              <h3>{featuredPost.title}</h3>
              <p>{featuredPost.summary}</p>
              <div className="featured-meta">
                <span>
                  {formatDate(featuredPost.date)} / {featuredPost.readingTime} 分钟阅读
                </span>
                <Link href={`/posts/${featuredPost.slug}`}>打开这篇</Link>
              </div>
            </article>
          ) : null}

          {recentPosts.length ? (
            <article className="hero-digest-card">
              <div className="hero-digest-heading">
                <p className="signal-label">最近更新</p>
                <Link href="/archive" className="post-link">
                  看归档
                </Link>
              </div>

              <div className="hero-digest-list">
                {recentPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    className="hero-digest-item"
                  >
                    <div>
                      <strong>{post.title}</strong>
                      <span>{post.formatLabel}</span>
                    </div>
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </Link>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">写作分类</p>
            <h2>我会用几种不同的方式更新这里</h2>
          </div>
          <p>有些内容适合慢慢写，有些只需要先记下来。分开之后，写起来和看起来都轻松一点。</p>
        </div>

        <div className="writing-tracks-grid">
          {writingTracks.map((track) => (
            <article key={track.key} className="track-card">
              <p className="signal-label">{track.label}</p>
              <strong>{track.count}</strong>
              <p>{track.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">最近更新</p>
            <h2>从正在写的内容开始看</h2>
          </div>
          <p>我把长文、短更新和方法类内容分开放了一点，这样首页不会都长一个样，也更容易顺着兴趣往下看。</p>
        </div>

        <div className="editorial-layout">
          {featuredPost ? (
            <article className="editorial-main">
              <p className="signal-label">主推内容</p>
              <div className="format-chip">{featuredPost.formatLabel}</div>
              <h3>{featuredPost.title}</h3>
              <p>{featuredPost.summary}</p>
              <div className="post-card-meta">
                <span>{formatDate(featuredPost.date)}</span>
                <span>{featuredPost.readingTime} 分钟阅读</span>
              </div>
              <Link href={`/posts/${featuredPost.slug}`} className="post-link">
                读这篇
              </Link>
            </article>
          ) : null}

          <div className="editorial-side">
            {spotlightPosts.slice(0, 3).map((post) => (
              <article key={post.slug} className="mini-post stacked-card">
                <div className="post-card-meta">
                  <span>{post.formatLabel}</span>
                  <span>{formatDate(post.date)}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <div className="stacked-card-extra">
                  <span>{post.readingTime} 分钟阅读</span>
                  <span>{post.tags.slice(0, 2).join(" / ") || "继续阅读"}</span>
                </div>
                <Link href={`/posts/${post.slug}`} className="post-link">
                  读下去
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {notebookPosts.length ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">短更新</p>
              <h2>一些没必要写成长文的内容</h2>
            </div>
            <p>有些东西如果等它完全想清楚，最后多半就不会写了。所以这里留给那些当下先记一笔的内容。</p>
          </div>

          <div className="note-ribbon stacked-card-group">
            {notebookPosts.map((post) => (
              <article key={post.slug} className="note-card stacked-card">
                <div className="post-card-meta">
                  <span>{post.formatLabel}</span>
                  <span>{formatDate(post.date)}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <div className="stacked-card-extra">
                  <span>{post.readingTime} 分钟阅读</span>
                  <span>{post.tags.slice(0, 2).join(" / ") || "现场记录"}</span>
                </div>
                <Link href={`/posts/${post.slug}`} className="post-link">
                  点开看看
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {guidePosts.length ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">方法和清单</p>
              <h2>写完之后还能反复用的内容</h2>
            </div>
            <p>有些文章不是为了表达感受，而是为了以后自己要用的时候能马上翻出来。</p>
          </div>

          <div className="post-grid stacked-card-group">
            {guidePosts.map((post) => (
              <article key={post.slug} className="post-card">
                <div className="post-card-shell stacked-card">
                  <div className="format-chip">{post.formatLabel}</div>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                  <div className="stacked-card-extra">
                    <span>{post.tags.join(" / ")}</span>
                    <span>{post.readingTime} 分钟</span>
                  </div>
                  <div className="post-card-meta">
                    <span>{formatDate(post.date)}</span>
                    <span>{post.series || "方法整理"}</span>
                  </div>
                  <Link href={`/posts/${post.slug}`} className="post-link">
                    打开这篇
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">常写的话题</p>
            <h2>最近会反复写到这些东西</h2>
          </div>
          <p>这些标签只是方便找内容，不是为了把站点分得特别规整。</p>
        </div>

        <div className="tag-cloud">
          {tagCloud.map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              {tag}
            </Link>
          ))}
        </div>
      </section>

      <section className="content-section about-teaser">
        <div className="section-heading">
          <div>
            <p className="eyebrow">关于这个站</p>
            <h2>这个站会一直留下来，慢慢积累我写过和做过的东西。</h2>
          </div>
          <p>
            写文章、改页面、补后台，我想把这些事情都留在同一个地方慢慢做。
          </p>
        </div>
        <Link href="/about" className="button button-primary">
          查看关于页
        </Link>
      </section>
    </main>
  );
}
