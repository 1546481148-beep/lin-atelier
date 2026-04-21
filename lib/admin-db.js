import { prisma } from "./prisma";

export async function withAdminDbFallback(task, fallbackValue) {
  try {
    return await task();
  } catch (error) {
    console.warn("[admin] 数据库暂时不可用，后台页使用兜底数据。");
    console.warn(error);
    return fallbackValue;
  }
}

export { prisma };
