import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "atelier-admin-session";

export const roleLabels = {
  ADMIN: "管理员",
  EDITOR: "编辑",
  READER: "读者",
};

export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireRole(allowedRoles) {
  const user = await requireSessionUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/admin");
  }

  return user;
}
