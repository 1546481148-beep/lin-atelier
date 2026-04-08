import { prisma } from "./prisma";
import { postStatusLabels } from "./post-workflow";

export const reviewActionLabels = {
  SUBMITTED: "提交审核",
  APPROVED: "通过发布",
  REJECTED: "驳回修改",
  MOVED_TO_DRAFT: "转回草稿",
};

export async function createPostReviewEvent({
  postId,
  actorId = null,
  action,
  fromStatus = null,
  toStatus,
  note = null,
}) {
  return prisma.postReviewEvent.create({
    data: {
      postId,
      actorId,
      action,
      fromStatus,
      toStatus,
      note,
    },
  });
}

export async function getPostReviewEvents(postId, limit = 20) {
  return prisma.postReviewEvent.findMany({
    where: { postId },
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

export function getReviewTransitionText(event) {
  const from = event.fromStatus ? postStatusLabels[event.fromStatus] : null;
  const to = postStatusLabels[event.toStatus] ?? event.toStatus;

  if (!from) {
    return `进入${to}`;
  }

  return `${from} -> ${to}`;
}
