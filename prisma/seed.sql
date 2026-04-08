INSERT INTO "User" (
  "id",
  "name",
  "email",
  "passwordHash",
  "role",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'seed-admin',
    'Lin Admin',
    'admin@atelier.local',
    '2fb7bf8469147418bab60256713e24ba:3a92ef16e5a954939a3f2be0622bd8ea2bf5221de32f0e40ea2467362b58177466aca10e33a9869818c253b21acfad7ad3edacaf096185164a1c9adee3d55acb',
    'ADMIN'::"Role",
    NOW(),
    NOW()
  ),
  (
    'seed-editor',
    'Ming Editor',
    'editor@atelier.local',
    'ec7f8f353f5ebbc1f6766c65cf9d17fd:1c693e5ec1e974f62643dac5d46030214b533cd2902d873d1d452cc8d30edc2aef6549acd4849ed3a1f8439f39edaaa664afa0853fa539be74a9299664eeec43',
    'EDITOR'::"Role",
    NOW(),
    NOW()
  ),
  (
    'seed-reader',
    'Yun Reader',
    'reader@atelier.local',
    '0ebf47fd5bc9d3d6ade613e8e2bd06ff:c004abe0852c75d383011b3f979c1ad5a34d22bc266a4bcad1470fea7c756313ec4525ffa58e906de690bcf3ee935a148b5b0f8ec568f65411973be45eb29043',
    'READER'::"Role",
    NOW(),
    NOW()
  )
ON CONFLICT ("email") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = EXCLUDED."role",
  "updatedAt" = NOW();

WITH admin_user AS (
  SELECT "id" FROM "User" WHERE "email" = 'admin@atelier.local'
), editor_user AS (
  SELECT "id" FROM "User" WHERE "email" = 'editor@atelier.local'
)
INSERT INTO "Post" (
  "id",
  "title",
  "slug",
  "summary",
  "content",
  "format",
  "tagsText",
  "highlightsText",
  "series",
  "mood",
  "status",
  "featured",
  "publishedAt",
  "createdAt",
  "updatedAt",
  "authorId"
)
SELECT
  'seed-post-foundation',
  '平台化改造的第一块地基',
  'platform-foundation',
  '把个人博客往用户、角色和后台骨架推进时，最先该搭好的那层结构。',
  '这是一篇数据库里的示例草稿，用来演示后台内容管理会如何承接公开博客的下一阶段。',
  'field-log',
  '平台开发,博客,后台',
  E'先把用户和角色跑通\n再把公开前台和后台发布接起来',
  '平台开发练习',
  '边做边记',
  'IN_REVIEW'::"PostStatus",
  FALSE,
  NULL,
  NOW(),
  NOW(),
  admin_user."id"
FROM admin_user
ON CONFLICT ("slug") DO UPDATE
SET
  "title" = EXCLUDED."title",
  "summary" = EXCLUDED."summary",
  "content" = EXCLUDED."content",
  "format" = EXCLUDED."format",
  "tagsText" = EXCLUDED."tagsText",
  "highlightsText" = EXCLUDED."highlightsText",
  "series" = EXCLUDED."series",
  "mood" = EXCLUDED."mood",
  "status" = EXCLUDED."status",
  "featured" = EXCLUDED."featured",
  "publishedAt" = EXCLUDED."publishedAt",
  "updatedAt" = NOW(),
  "authorId" = EXCLUDED."authorId";

WITH editor_user AS (
  SELECT "id" FROM "User" WHERE "email" = 'editor@atelier.local'
)
INSERT INTO "Post" (
  "id",
  "title",
  "slug",
  "summary",
  "content",
  "format",
  "tagsText",
  "highlightsText",
  "series",
  "mood",
  "status",
  "featured",
  "publishedAt",
  "createdAt",
  "updatedAt",
  "authorId"
)
SELECT
  'seed-post-workbench',
  '写作工作台的第一版想法',
  'editorial-workbench',
  '编辑角色需要哪些最小能力，才能把 Markdown 写作体验升级成平台工作流。',
  '这篇示例内容由 editor 角色拥有，用来测试“只能管理自己的文章”这条权限链路。',
  'essay',
  '写作,平台开发',
  E'后台文章已经可以进入公开前台\n编辑角色只会看到自己的内容',
  '写作工作台',
  '清晰、直接',
  'PUBLISHED'::"PostStatus",
  FALSE,
  TIMESTAMP WITH TIME ZONE '2026-03-31T08:00:00.000Z',
  NOW(),
  NOW(),
  editor_user."id"
FROM editor_user
ON CONFLICT ("slug") DO UPDATE
SET
  "title" = EXCLUDED."title",
  "summary" = EXCLUDED."summary",
  "content" = EXCLUDED."content",
  "format" = EXCLUDED."format",
  "tagsText" = EXCLUDED."tagsText",
  "highlightsText" = EXCLUDED."highlightsText",
  "series" = EXCLUDED."series",
  "mood" = EXCLUDED."mood",
  "status" = EXCLUDED."status",
  "featured" = EXCLUDED."featured",
  "publishedAt" = EXCLUDED."publishedAt",
  "updatedAt" = NOW(),
  "authorId" = EXCLUDED."authorId";

WITH
  admin_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'admin@atelier.local'
  ),
  editor_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'editor@atelier.local'
  ),
  foundation_post AS (
    SELECT "id", "title" FROM "Post" WHERE "slug" = 'platform-foundation'
  ),
  workbench_post AS (
    SELECT "id", "title" FROM "Post" WHERE "slug" = 'editorial-workbench'
  )
INSERT INTO "AuditLog" (
  "id",
  "action",
  "targetType",
  "targetId",
  "targetLabel",
  "summary",
  "actorId",
  "createdAt"
)
SELECT
  'seed-audit-foundation-submit',
  'POST_SUBMITTED',
  'post',
  foundation_post."id",
  foundation_post."title",
  'Lin Admin 提交了《平台化改造的第一块地基》进入审核。',
  admin_user."id",
  NOW()
FROM admin_user, foundation_post
ON CONFLICT ("id") DO UPDATE
SET
  "targetId" = EXCLUDED."targetId",
  "targetLabel" = EXCLUDED."targetLabel",
  "summary" = EXCLUDED."summary",
  "actorId" = EXCLUDED."actorId";

WITH
  admin_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'admin@atelier.local'
  ),
  workbench_post AS (
    SELECT "id", "title" FROM "Post" WHERE "slug" = 'editorial-workbench'
  )
INSERT INTO "AuditLog" (
  "id",
  "action",
  "targetType",
  "targetId",
  "targetLabel",
  "summary",
  "actorId",
  "createdAt"
)
SELECT
  'seed-audit-workbench-approve',
  'POST_APPROVED',
  'post',
  workbench_post."id",
  workbench_post."title",
  'Lin Admin 通过并发布了《写作工作台的第一版想法》。',
  admin_user."id",
  NOW()
FROM admin_user, workbench_post
ON CONFLICT ("id") DO UPDATE
SET
  "targetId" = EXCLUDED."targetId",
  "targetLabel" = EXCLUDED."targetLabel",
  "summary" = EXCLUDED."summary",
  "actorId" = EXCLUDED."actorId";

WITH
  admin_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'admin@atelier.local'
  ),
  editor_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'editor@atelier.local'
  ),
  foundation_post AS (
    SELECT "id" FROM "Post" WHERE "slug" = 'platform-foundation'
  ),
  workbench_post AS (
    SELECT "id" FROM "Post" WHERE "slug" = 'editorial-workbench'
  )
INSERT INTO "PostReviewEvent" (
  "id",
  "action",
  "fromStatus",
  "toStatus",
  "note",
  "postId",
  "actorId",
  "createdAt"
)
SELECT
  'seed-review-foundation-submit',
  'SUBMITTED',
  'DRAFT'::"PostStatus",
  'IN_REVIEW'::"PostStatus",
  NULL,
  foundation_post."id",
  admin_user."id",
  NOW()
FROM foundation_post, admin_user
ON CONFLICT ("id") DO UPDATE
SET
  "postId" = EXCLUDED."postId",
  "actorId" = EXCLUDED."actorId";

WITH
  editor_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'editor@atelier.local'
  ),
  workbench_post AS (
    SELECT "id" FROM "Post" WHERE "slug" = 'editorial-workbench'
  )
INSERT INTO "PostReviewEvent" (
  "id",
  "action",
  "fromStatus",
  "toStatus",
  "note",
  "postId",
  "actorId",
  "createdAt"
)
SELECT
  'seed-review-workbench-submit',
  'SUBMITTED',
  'DRAFT'::"PostStatus",
  'IN_REVIEW'::"PostStatus",
  NULL,
  workbench_post."id",
  editor_user."id",
  NOW()
FROM workbench_post, editor_user
ON CONFLICT ("id") DO UPDATE
SET
  "postId" = EXCLUDED."postId",
  "actorId" = EXCLUDED."actorId";

WITH
  admin_user AS (
    SELECT "id" FROM "User" WHERE "email" = 'admin@atelier.local'
  ),
  workbench_post AS (
    SELECT "id" FROM "Post" WHERE "slug" = 'editorial-workbench'
  )
INSERT INTO "PostReviewEvent" (
  "id",
  "action",
  "fromStatus",
  "toStatus",
  "note",
  "postId",
  "actorId",
  "createdAt"
)
SELECT
  'seed-review-workbench-approve',
  'APPROVED',
  'IN_REVIEW'::"PostStatus",
  'PUBLISHED'::"PostStatus",
  NULL,
  workbench_post."id",
  admin_user."id",
  NOW()
FROM workbench_post, admin_user
ON CONFLICT ("id") DO UPDATE
SET
  "postId" = EXCLUDED."postId",
  "actorId" = EXCLUDED."actorId";
