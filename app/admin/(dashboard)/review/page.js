import Link from "next/link";
import { approveAdminPost } from "../../actions";
import { requireRole } from "../../../../lib/auth";
import { postStatusLabels } from "../../../../lib/post-workflow";
import { prisma } from "../../../../lib/prisma";

export const metadata = {
  title: "待审核队列",
  description: "集中处理正在等待审核的内容。",
};

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function buildSortHref(sort, authorId) {
  const params = new URLSearchParams();

  if (sort && sort !== "latest") {
    params.set("sort", sort);
  }

  if (authorId && authorId !== "all") {
    params.set("author", authorId);
  }

  const query = params.toString();
  return query ? `/admin/review?${query}` : "/admin/review";
}

export default async function AdminReviewQueuePage({ searchParams }) {
  await requireRole(["ADMIN"]);

  const params = await searchParams;
  const selectedAuthor =
    typeof params?.author === "string" && params.author ? params.author : "all";
  const selectedSort = params?.sort === "oldest" ? "oldest" : "latest";

  const authors = await prisma.user.findMany({
    where: {
      posts: {
        some: {
          status: "IN_REVIEW",
        },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  const posts = await prisma.post.findMany({
    where: {
      status: "IN_REVIEW",
      ...(selectedAuthor !== "all" ? { authorId: selectedAuthor } : {}),
    },
    orderBy: [{ updatedAt: selectedSort === "oldest" ? "asc" : "desc" }],
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">审核队列</p>
          <h2>先处理正在等结果的内容</h2>
        </div>
        <Link href="/admin/posts?status=IN_REVIEW" className="button button-secondary">
          回文章列表看待审核
        </Link>
      </div>

      <p className="admin-page-intro">
        这页只放正在等待审核的文章。平台里的队列页不是为了多一层跳转，而是为了把“现在最该处理什么”单独拎出来。
      </p>

      <div className="admin-filter-bar" aria-label="审核队列筛选">
        <Link
          href={buildSortHref("latest", selectedAuthor)}
          className={`admin-filter-chip${selectedSort === "latest" ? " is-active" : ""}`}
        >
          最新优先
        </Link>
        <Link
          href={buildSortHref("oldest", selectedAuthor)}
          className={`admin-filter-chip${selectedSort === "oldest" ? " is-active" : ""}`}
        >
          最早优先
        </Link>
        <Link
          href={buildSortHref(selectedSort, "all")}
          className={`admin-filter-chip${selectedAuthor === "all" ? " is-active" : ""}`}
        >
          全部作者
        </Link>
        {authors.map((author) => (
          <Link
            key={author.id}
            href={buildSortHref(selectedSort, author.id)}
            className={`admin-filter-chip${selectedAuthor === author.id ? " is-active" : ""}`}
          >
            {author.name}
          </Link>
        ))}
      </div>

      {posts.length ? (
        <div className="admin-list">
          {posts.map((post) => (
            <article key={post.id} className="admin-list-card">
              <div>
                <p className="signal-label">{postStatusLabels[post.status]}</p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <div className="admin-inline-note">
                  <span>作者：{post.author.name}</span>
                  <span>邮箱：{post.author.email}</span>
                  <span>最后更新：{formatDateTime(post.updatedAt)}</span>
                </div>
              </div>
              <div className="admin-list-meta">
                <span>Slug：{post.slug}</span>
                <span>形态：{post.format}</span>
                <span>标签：{post.tagsText || "还没有写标签"}</span>
                <div className="admin-list-actions">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="button button-secondary admin-list-button"
                  >
                    去审核
                  </Link>
                  <form action={approveAdminPost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="button button-primary admin-list-button"
                    >
                      通过发布
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>当前筛选下没有待审核内容</strong>
          <p>可以切回全部作者，或者换一个排序方式看看。新内容一提交，这里会自动出现。</p>
        </div>
      )}
    </section>
  );
}