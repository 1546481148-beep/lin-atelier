const { PrismaClient, Role, PostStatus } = require("@prisma/client");

const prisma = new PrismaClient();

async function upsertUser({ email, name, role }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role },
  });
}

async function main() {
  const admin = await upsertUser({
    email: "admin@atelier.local",
    name: "Lin Admin",
    role: Role.ADMIN,
  });

  const editor = await upsertUser({
    email: "editor@atelier.local",
    name: "Ming Editor",
    role: Role.EDITOR,
  });

  await upsertUser({
    email: "reader@atelier.local",
    name: "Yun Reader",
    role: Role.READER,
  });

  await prisma.post.upsert({
    where: { slug: "platform-foundation" },
    update: {
      title: "平台化改造的第一块地基",
      summary: "把个人博客往用户、角色和后台骨架推进时，最先该搭好的那层结构。",
      content:
        "这是一篇数据库里的示例草稿，用来演示后台内容管理会如何承接公开博客的下一阶段。",
      status: PostStatus.DRAFT,
      authorId: admin.id,
    },
    create: {
      title: "平台化改造的第一块地基",
      slug: "platform-foundation",
      summary: "把个人博客往用户、角色和后台骨架推进时，最先该搭好的那层结构。",
      content:
        "这是一篇数据库里的示例草稿，用来演示后台内容管理会如何承接公开博客的下一阶段。",
      status: PostStatus.DRAFT,
      authorId: admin.id,
    },
  });

  await prisma.post.upsert({
    where: { slug: "editorial-workbench" },
    update: {
      title: "写作工作台的第一版想法",
      summary: "编辑角色需要哪些最小能力，才能把 Markdown 写作体验升级成平台工作流。",
      content:
        "这篇示例内容由 editor 角色拥有，用来测试“只能管理自己的文章”这条权限链路。",
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
      status: PostStatus.PUBLISHED,
      publishedAt: new Date("2026-03-31T08:00:00.000Z"),
      authorId: editor.id,
    },
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
