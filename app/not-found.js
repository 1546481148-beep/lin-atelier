import Link from "next/link";
import { SiteHeader } from "../components/site-header";

export default function NotFoundPage() {
  return (
    <main className="site-shell inner-page">
      <SiteHeader />
      <section className="page-hero">
        <p className="eyebrow">404</p>
        <h1>这篇内容暂时不存在。</h1>
        <p className="hero-lead">
          可能它还没有公开，或者地址已经变更。你可以先回到首页继续看最新文章。
        </p>
        <Link href="/" className="button button-primary">
          回到首页
        </Link>
      </section>
    </main>
  );
}
