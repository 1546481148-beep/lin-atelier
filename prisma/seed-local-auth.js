const { PrismaClient, Role, PostStatus } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function upsertUser({ email, name, role, password }) {
  const passwordHash = hashPassword(password);

  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  const admin = await upsertUser({
    email: "admin@atelier.local",
    name: "Lin Admin",
    role: Role.ADMIN,
    password: "atelier-admin",
  });

  const editor = await upsertUser({
    email: "editor@atelier.local",
    name: "Ming Editor",
    role: Role.EDITOR,
    password: "atelier-editor",
  });

  await upsertUser({
    email: "reader@atelier.local",
    name: "Yun Reader",
    role: Role.READER,
    password: "atelier-reader",
  });

  await prisma.auditLog.deleteMany();
  await prisma.postReviewEvent.deleteMany();

  const foundationPost = await prisma.post.upsert({
    where: { slug: "platform-foundation" },
    update: {
      title: "平台化改造的第一块地基",
      summary: "把个人博客往用户、角色和后台骨架推进时，最先该搭好的那层结构。",
      content:
        "这是一篇数据库里的示例草稿，用来演示后台内容管理会如何承接公开博客的下一阶段。",
      format: "field-log",
      tagsText: "平台开发,博客,后台",
      highlightsText: "先把用户和角色跑通\n再把公开前台和后台发布接起来",
      series: "平台开发练习",
      mood: "边做边记",
      status: PostStatus.IN_REVIEW,
      authorId: admin.id,
    },
    create: {
      title: "平台化改造的第一块地基",
      slug: "platform-foundation",
      summary: "把个人博客往用户、角色和后台骨架推进时，最先该搭好的那层结构。",
      content:
        "这是一篇数据库里的示例草稿，用来演示后台内容管理会如何承接公开博客的下一阶段。",
      format: "field-log",
      tagsText: "平台开发,博客,后台",
      highlightsText: "先把用户和角色跑通\n再把公开前台和后台发布接起来",
      series: "平台开发练习",
      mood: "边做边记",
      status: PostStatus.IN_REVIEW,
      authorId: admin.id,
    },
  });

  const workbenchPost = await prisma.post.upsert({
    where: { slug: "editorial-workbench" },
    update: {
      title: "写作工作台的第一版想法",
      summary: "编辑角色需要哪些最小能力，才能把 Markdown 写作体验升级成平台工作流。",
      content:
        "这篇示例内容由 editor 角色拥有，用来测试“只能管理自己的文章”这条权限链路。",
      format: "essay",
      tagsText: "写作,平台开发",
      highlightsText: "后台文章已经可以进入公开前台\n编辑角色只会看到自己的内容",
      series: "写作工作台",
      mood: "清晰、直接",
      status: PostStatus.PUBLISHED,
      publishedAt: new Date("2026-03-31T08:00:00.000Z"),
      authorId: editor.id,
    },
    create: {
      title: "写作工作台的第一版想法",
      slug: "editorial-workbench",
      summary: "编辑角色需要哪些最小能力，才能把 Markdown 写作体验升级成平台工作流。",
      content:
        "这篇示例内容由 editor 角色拥有，用来测试“只能管理自己的文章”这条权限链路。",
      format: "essay",
      tagsText: "写作,平台开发",
      highlightsText: "后台文章已经可以进入公开前台\n编辑角色只会看到自己的内容",
      series: "写作工作台",
      mood: "清晰、直接",
      status: PostStatus.PUBLISHED,
      publishedAt: new Date("2026-03-31T08:00:00.000Z"),
      authorId: editor.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: "POST_SUBMITTED",
        actorId: admin.id,
        targetType: "post",
        targetId: foundationPost.id,
        targetLabel: foundationPost.title,
        summary: `Lin Admin 提交了《${foundationPost.title}》进入审核。`,
      },
      {
        action: "POST_APPROVED",
        actorId: admin.id,
        targetType: "post",
        targetId: workbenchPost.id,
        targetLabel: workbenchPost.title,
        summary: `Lin Admin 通过并发布了《${workbenchPost.title}》。`,
      },
    ],
  });

  await prisma.postReviewEvent.createMany({
    data: [
      {
        action: "SUBMITTED",
        fromStatus: PostStatus.DRAFT,
        toStatus: PostStatus.IN_REVIEW,
        postId: foundationPost.id,
        actorId: admin.id,
      },
      {
        action: "SUBMITTED",
        fromStatus: PostStatus.DRAFT,
        toStatus: PostStatus.IN_REVIEW,
        postId: workbenchPost.id,
        actorId: editor.id,
      },
      {
        action: "APPROVED",
        fromStatus: PostStatus.IN_REVIEW,
        toStatus: PostStatus.PUBLISHED,
        postId: workbenchPost.id,
        actorId: admin.id,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
