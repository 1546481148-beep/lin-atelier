import { updateOwnPassword } from "../../actions";
import { requireSessionUser, roleLabels } from "../../../../lib/auth";

export const metadata = {
  title: "账户设置",
  description: "查看当前登录账号并修改密码。",
};

const errorMap = {
  "missing-fields": "当前密码、新密码和确认密码都需要填写。",
  "weak-password": "新密码至少需要 8 位。",
  "password-mismatch": "两次输入的新密码不一致。",
  "invalid-current-password": "当前密码不正确。",
};

const successMap = {
  "password-updated": "密码已经更新，下次登录请使用新密码。",
};

export default async function AdminAccountPage({ searchParams }) {
  const user = await requireSessionUser();
  const query = await searchParams;
  const errorMessage = errorMap[query?.error] ?? null;
  const successMessage = successMap[query?.success] ?? null;

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">账户</p>
          <h2>账户设置</h2>
        </div>
        <p>这里主要用来查看当前账号信息和改密码。</p>
      </div>

      <article className="admin-auth-card">
        <div className="admin-account-summary">
          <div>
            <span>当前身份</span>
            <strong>{user.name}</strong>
          </div>
          <div>
            <span>邮箱</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>角色</span>
            <strong>{roleLabels[user.role]}</strong>
          </div>
        </div>
      </article>

      {errorMessage ? <p className="admin-form-error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-success">{successMessage}</p> : null}

      <article className="admin-auth-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">修改密码</p>
            <h2>修改自己的密码</h2>
          </div>
          <p>改之前会先校验当前密码，避免误改。</p>
        </div>

        <form action={updateOwnPassword} className="admin-form">
          <label className="admin-field">
            <span>当前密码</span>
            <input type="password" name="currentPassword" required />
          </label>

          <div className="admin-form-grid">
            <label className="admin-field">
              <span>新密码</span>
              <input type="password" name="nextPassword" minLength="8" required />
            </label>

            <label className="admin-field">
              <span>确认新密码</span>
              <input type="password" name="confirmPassword" minLength="8" required />
            </label>
          </div>

          <button type="submit" className="button button-primary">
            更新密码
          </button>
        </form>
      </article>
    </section>
  );
}
