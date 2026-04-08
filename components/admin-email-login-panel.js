import Link from "next/link";
import { roleLabels } from "../lib/auth";

const demoAccounts = [
  {
    role: "ADMIN",
    email: "admin@atelier.local",
    password: "atelier-admin",
  },
  {
    role: "EDITOR",
    email: "editor@atelier.local",
    password: "atelier-editor",
  },
  {
    role: "READER",
    email: "reader@atelier.local",
    password: "atelier-reader",
  },
];

export function AdminEmailLoginPanel({ errorMessage, signInAction }) {
  return (
    <main className="site-shell inner-page">
      <section className="page-hero admin-hero">
        <p className="eyebrow">后台登录</p>
        <h1>邮箱密码登录</h1>
        <p className="hero-lead">
          这里先用本地账号登录后台，主要拿来测试登录、角色和发文流程。
        </p>
      </section>

      <section className="content-section admin-auth-layout">
        <article className="admin-auth-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">登录</p>
              <h2>进入后台</h2>
            </div>
          </div>

          {errorMessage ? <p className="admin-form-error">{errorMessage}</p> : null}

          <form action={signInAction} className="admin-form">
            <label className="admin-field">
              <span>邮箱</span>
              <input type="email" name="email" placeholder="admin@atelier.local" required />
            </label>

            <label className="admin-field">
              <span>密码</span>
              <input type="password" name="password" placeholder="请输入密码" required />
            </label>

            <button type="submit" className="button button-primary">
              登录后台
            </button>
          </form>
        </article>

        <article className="admin-auth-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">测试账号</p>
              <h2>现在可以直接用这些账号进入</h2>
            </div>
          </div>

          <div className="admin-credentials-list">
            {demoAccounts.map((account) => (
              <div key={account.email} className="admin-credential-card">
                <strong>{roleLabels[account.role]}</strong>
                <span>邮箱：{account.email}</span>
                <span>密码：{account.password}</span>
              </div>
            ))}
          </div>

          <p className="reader-minimal-hint">
            这些账号是本地测试数据，只用来练后台登录、权限和发布流程。
          </p>

          <Link href="/" className="button button-secondary">
            返回公开博客
          </Link>
        </article>
      </section>
    </main>
  );
}
