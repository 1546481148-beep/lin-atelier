import Link from "next/link";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/tags", label: "标签" },
  { href: "/archive", label: "归档" },
  { href: "/about", label: "关于" },
  { href: "/admin/login", label: "后台" },
];

export function SiteHeader() {
  return (
    <header className="topbar">
      <Link href="/" className="brand-mark">
        Lin&apos;s Atelier
      </Link>
      <nav className="topnav" aria-label="主导航">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
