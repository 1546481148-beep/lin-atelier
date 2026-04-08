import {
  createAdminUser,
  resetAdminUserPassword,
  updateAdminUserRole,
} from "../../actions";
import { requireRole, roleLabels } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const metadata = {
  title: "用户管理",
  description: "查看当前用户、角色，并在后台新建账号。",
};

const roles = ["ADMIN", "EDITOR", "READER"];

const errorMap = {
  "missing-fields": "名字、邮箱和密码都需要填写。",
  "invalid-role": "提交的角色不合法，请重新选择。",
  "weak-password": "密码至少需要 8 位。",
  "email-taken": "这个邮箱已经存在了。",
  "self-role-lock": "不能把当前登录的管理员自己降权。",
  "user-missing": "要修改的用户不存在。",
};

const successMap = {
  "user-created": "新用户已经创建成功。",
  "role-updated": "用户角色已经更新。",
  "password-reset": "用户密码已经重置成功。",
};

export default async function AdminUsersPage({ searchParams }) {
  const currentUser = await requireRole(["ADMIN"]);
  const query = await searchParams;
  const errorMessage = errorMap[query?.error] ?? null;
  const successMessage = successMap[query?.success] ?? null;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">用户</p>
          <h2>当前平台用户</h2>
        </div>
        <p>现在可以直接在这里加人、改角色、重置密码，不需要再靠种子数据手动准备账号。</p>
      </div>

      {errorMessage ? <p className="admin-form-error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-success">{successMessage}</p> : null}

      <article className="admin-auth-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">新建用户</p>
            <h2>新建后台用户</h2>
          </div>
          <p>先把名字、邮箱、密码和角色填进去，账号就能立刻用。</p>
        </div>

        <form action={createAdminUser} className="admin-form">
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>名字</span>
              <input type="text" name="name" placeholder="例如：小林" required />
            </label>

            <label className="admin-field">
              <span>邮箱</span>
              <input
                type="email"
                name="email"
                placeholder="例如：xiaolin@atelier.local"
                required
              />
            </label>

            <label className="admin-field">
              <span>初始密码</span>
              <input
                type="password"
                name="password"
                placeholder="至少 8 位"
                minLength="8"
                required
              />
            </label>

            <label className="admin-field">
              <span>角色</span>
              <select name="role" defaultValue="READER">
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button type="submit" className="button button-primary">
            创建用户
          </button>
        </form>
      </article>

      <div className="admin-list">
        {users.map((user) => (
          <article key={user.id} className="admin-list-card">
            <div>
              <p className="signal-label">{roleLabels[user.role]}</p>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
            <div className="admin-list-meta">
              <span>文章数：{user._count.posts}</span>
              <span>创建时间：{new Intl.DateTimeFormat("zh-CN").format(user.createdAt)}</span>
              <span>{user.id === currentUser.id ? "当前登录用户" : "可调整角色"}</span>
              <form action={updateAdminUserRole} className="admin-inline-form">
                <input type="hidden" name="userId" value={user.id} />
                <select name="role" defaultValue={user.role}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="button button-secondary admin-list-button">
                  更新角色
                </button>
              </form>
              <form action={resetAdminUserPassword} className="admin-inline-form">
                <input type="hidden" name="userId" value={user.id} />
                <input
                  type="password"
                  name="password"
                  minLength="8"
                  placeholder="重置为新密码"
                  required
                />
                <button type="submit" className="button button-primary admin-list-button">
                  重置密码
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
