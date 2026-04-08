import { createAdminPost } from "../../../actions";
import { requireRole, roleLabels } from "../../../../../lib/auth";
import {
  getEditableStatusOptions,
  getRolePostGuidance,
} from "../../../../../lib/post-workflow";

export const metadata = {
  title: "新建文章",
  description: "在后台新建一篇文章。",
};

const errorMap = {
  "missing-fields": "标题、摘要和正文都需要填写。",
  "slug-taken": "这个 slug 已经被占用了，换一个再试。",
};

const postFormats = [
  { value: "essay", label: "长文" },
  { value: "note", label: "短记" },
  { value: "tutorial", label: "指南" },
  { value: "field-log", label: "现场记录" },
];

export default async function AdminNewPostPage({ searchParams }) {
  const user = await requireRole(["ADMIN", "EDITOR"]);
  const params = await searchParams;
  const error = errorMap[params?.error] ?? null;
  const statusOptions = getEditableStatusOptions(user.role);
  const roleGuidance = getRolePostGuidance(user.role);

  return (
    <section className="content-section admin-page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">新建文章</p>
          <h2>以 {roleLabels[user.role]} 身份写一篇新内容</h2>
        </div>
        <p>{roleGuidance.creator}</p>
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}

      <form action={createAdminPost} className="admin-form">
        <label className="admin-field">
          <span>标题</span>
          <input
            type="text"
            name="title"
            placeholder="例如：这周把后台发布接到前台了"
            required
          />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input
            type="text"
            name="slug"
            placeholder="zhe-zhou-ba-hou-tai-jie-dao-qian-tai"
          />
        </label>

        <label className="admin-field">
          <span>摘要</span>
          <textarea
            name="summary"
            rows="3"
            placeholder="用一句话说清楚这篇主要写了什么。"
            required
          />
        </label>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>内容形态</span>
            <select name="format" defaultValue="essay">
              {postFormats.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>标签</span>
            <input
              type="text"
              name="tagsText"
              placeholder="例如：写作, 平台开发, 博客"
            />
          </label>

          <label className="admin-field">
            <span>系列</span>
            <input type="text" name="series" placeholder="建站记录" />
          </label>

          <label className="admin-field">
            <span>语气</span>
            <input type="text" name="mood" placeholder="边做边记" />
          </label>
        </div>

        <label className="admin-field">
          <span>正文</span>
          <textarea
            name="content"
            rows="10"
            placeholder="正文从这里开始写。"
            required
          />
        </label>

        <label className="admin-field">
          <span>亮点摘要</span>
          <textarea
            name="highlightsText"
            rows="4"
            placeholder={"每行一条\n例如：这篇先解释为什么要做后台\n再记录我是怎么把发布流程接到前台的"}
          />
        </label>

        <label className="admin-field">
          <span>封面图</span>
          <input
            type="text"
            name="cover"
            placeholder="/images/cover-studio.svg"
          />
        </label>

        <div className="admin-form-inline">
          <label className="admin-field">
            <span>状态</span>
            <select name="status" defaultValue="DRAFT">
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-checkbox">
            <input type="checkbox" name="featured" />
            <span>标记为首页重点内容</span>
          </label>
        </div>

        <button type="submit" className="button button-primary">
          保存文章
        </button>
      </form>
    </section>
  );
}