# Lin's Atelier

一个用 `Next.js` 做的中文个人博客，同时带有后台、角色、审核流和日志这些平台练习能力。

## 本地运行

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

默认开发地址是 `http://localhost:3000`。

## 常用脚本

```bash
npm run dev
npm run build
npm run start
npm run db:push
npm run db:seed
```

说明：
- `db:push` 会把 Prisma schema 同步到你的数据库
- `db:seed` 会写入本地演示账号和示例文章

## 环境变量

参考 [.env.example](./.env.example)：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

## 公开部署

现在推荐的部署路线是：`GitHub + Vercel + Postgres`。

原因：
- 这是标准的 `Next.js App Router` 项目
- 当前项目已经接了 Prisma 和后台功能
- Vercel 更适合配合托管 Postgres 使用

### 1. 准备数据库

先创建一个 Postgres 数据库，常见选择有：
- Neon
- Supabase
- Railway
- Vercel Postgres

拿到连接串后，记下来，后面会填到 `DATABASE_URL`。

### 2. 推到 GitHub

```bash
git init
git add .
git commit -m "Initial blog"
```

如果 `git commit` 提示没有身份信息，先设置：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

然后新建 GitHub 仓库并推送。

### 3. 导入到 Vercel

1. 登录 Vercel
2. 点击 `Add New Project`
3. 导入这个 GitHub 仓库
4. 保持默认的 Next.js 构建设置
5. 添加环境变量：

```bash
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
DATABASE_URL=你的 Postgres 连接串
```

### 4. 初始化线上数据库

第一次部署后，在本地或数据库管理端执行一次：

```bash
npm run db:push
npm run db:seed
```

如果你是连远程数据库执行，本地 `.env` 里的 `DATABASE_URL` 需要先指向那份线上数据库。

### 5. 绑定域名

如果你有自己的域名：
- 在 Vercel 项目设置里绑定域名
- 把 `NEXT_PUBLIC_SITE_URL` 改成正式域名

## 已经准备好的上线能力

- 自动生成 `robots.txt`
- 自动生成 `sitemap.xml`
- 页面 metadata 已接好
- 前台公开文章和后台数据库文章已经打通
- 后台有登录、角色、审核流、日志和批量处理
