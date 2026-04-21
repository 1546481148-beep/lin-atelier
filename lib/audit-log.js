import { prisma } from "./prisma";

export const auditTargetLabels = {
  post: "内容",
  user: "用户",
  account: "账户",
  "incoming-link": "外部链接",
};

export const auditActionLabels = {
  POST_CREATED: "新建内容",
  POST_UPDATED: "修改内容",
  POST_SUBMITTED: "提交审核",
  POST_APPROVED: "通过发布",
  POST_REJECTED: "驳回内容",
  POST_MOVED_TO_DRAFT: "转回草稿",
  USER_CREATED: "新建用户",
  USER_ROLE_UPDATED: "修改角色",
  USER_PASSWORD_RESET: "重置密码",
  ACCOUNT_PASSWORD_UPDATED: "修改密码",
  INCOMING_LINK_RECEIVED: "接收并解析链接",
  INCOMING_LINK_FAILED: "接收链接失败",
  INCOMING_LINK_RETRIED: "重新解析链接",
};

function buildAuditLogWhere({ actorId, targetType, targetId, action } = {}) {
  return {
    ...(actorId ? { actorId } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
    ...(action ? { action } : {}),
  };
}

export async function createAuditLog({
  action,
  actorId = null,
  targetType,
  targetId,
  targetLabel,
  summary,
}) {
  return prisma.auditLog.create({
    data: {
      action,
      actorId,
      targetType,
      targetId,
      targetLabel,
      summary,
    },
  });
}

export async function getAuditLogs({
  limit = 10,
  actorId,
  targetType,
  targetId,
  action,
} = {}) {
  return prisma.auditLog.findMany({
    where: buildAuditLogWhere({ actorId, targetType, targetId, action }),
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });
}

export async function getAuditLogOverview({ actorId } = {}) {
  const baseWhere = buildAuditLogWhere({ actorId });
  const [total, postCount, userCount, accountCount, incomingLinkCount] = await Promise.all([
    prisma.auditLog.count({ where: baseWhere }),
    prisma.auditLog.count({
      where: buildAuditLogWhere({ actorId, targetType: "post" }),
    }),
    prisma.auditLog.count({
      where: buildAuditLogWhere({ actorId, targetType: "user" }),
    }),
    prisma.auditLog.count({
      where: buildAuditLogWhere({ actorId, targetType: "account" }),
    }),
    prisma.auditLog.count({
      where: buildAuditLogWhere({ actorId, targetType: "incoming-link" }),
    }),
  ]);

  return {
    total,
    postCount,
    userCount,
    accountCount,
    incomingLinkCount,
  };
}
