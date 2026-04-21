import Link from "next/link";
import { signOut } from "../actions";
import { requireSessionUser, roleLabels } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "概览", roles: ["ADMIN", "EDITOR", "READER"] },
  { href: "/admin/posts", label: "文章", roles: ["ADMIN", "EDITOR"] },
  { href: "/admin/incoming-links", label: "链接接收", roles: ["ADMIN", "EDITOR"] },
  { href: "/admin/review", label: "待审核", roles: ["ADMIN"] },
  { href: "/admin/posts/new", label: "新建", roles: ["ADMIN", "EDITOR"] },
  { href: "/admin/logs", label: "日志", roles: ["ADMIN"] },
  { href: "/admin/account", label: "账户", roles: ["ADMIN", "EDITOR", "READER"] },
  { href: "/admin/users", label: "用户", roles: ["ADMIN"] },
];

export default async function AdminDashboardLayout({ children }) {
  const user = await requireSessionUser();
  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <main className="site-shell admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">后台</p>
          <h1>博客后台</h1>
          <p className="hero-lead">
            当前身份：{user.name} / {roleLabels[user.role]}
          </p>
        </div>

        <div className="admin-topbar-actions">
          <Link href="/" className="button button-secondary">
            公开博客
          </Link>
          <form action={signOut}>
            <button type="submit" className="button button-primary">
              退出后台
            </button>
          </form>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav className="admin-nav" aria-label="后台导航">
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="admin-sidebar-note">
            <strong>现在能做的事</strong>
            <span>
              这里已经可以管理文章、审核流、外部链接接收和用户账户，适合继续往真正的平台后台扩展。
            </span>
          </div>
        </aside>

        <section className="admin-main">{children}</section>
      </div>
    </main>
  );
}
