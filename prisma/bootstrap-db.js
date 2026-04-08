const message = [
  'bootstrap-db.js 已停用。',
  '现在请改用 Prisma 的标准流程：',
  '1. npm run db:push',
  '2. npm run db:seed',
].join('\n');

console.log(message);
