import { PostStatus } from "@prisma/client";

export const postStatusLabels = {
  [PostStatus.DRAFT]: "草稿",
  [PostStatus.IN_REVIEW]: "待审核",
  [PostStatus.PUBLISHED]: "已发布",
  [PostStatus.REJECTED]: "已驳回",
};

export function getEditableStatusOptions(role) {
  if (role === "ADMIN") {
    return [
      { value: PostStatus.DRAFT, label: postStatusLabels[PostStatus.DRAFT] },
      {
        value: PostStatus.IN_REVIEW,
        label: postStatusLabels[PostStatus.IN_REVIEW],
      },
      {
        value: PostStatus.PUBLISHED,
        label: postStatusLabels[PostStatus.PUBLISHED],
      },
    ];
  }

  return [
    { value: PostStatus.DRAFT, label: postStatusLabels[PostStatus.DRAFT] },
    {
      value: PostStatus.IN_REVIEW,
      label: postStatusLabels[PostStatus.IN_REVIEW],
    },
  ];
}

export function getRolePostGuidance(role) {
  if (role === "ADMIN") {
    return {
      list: "你可以看全部内容，也可以直接通过、驳回或调整状态。",
      editor:
        "管理员除了改内容，还负责决定文章能不能公开，以及什么时候退回给编辑继续改。",
      creator:
        "管理员可以直接保存草稿、提交审核，必要时也能直接发布。",
    };
  }

  return {
    list: "你主要负责写作和修改自己的内容，准备好后再提交审核。",
    editor:
      "你可以继续修改自己的内容，也能把它提交回审核，但不能直接发布或驳回别人。",
    creator:
      "先把内容写出来，再决定是留在草稿里，还是提交审核等管理员处理。",
  };
}

export function getSubmitReviewLabel(status) {
  if (status === PostStatus.REJECTED) {
    return "修改后重新提交";
  }

  return "提交审核";
}

export function getMoveToDraftLabel(role, status) {
  if (role === "ADMIN") {
    if (status === PostStatus.PUBLISHED) {
      return "下线并转回草稿";
    }

    return "转回草稿";
  }

  if (status === PostStatus.IN_REVIEW) {
    return "撤回继续修改";
  }

  return "回到草稿";
}

export function getWorkflowActionGuidance(role, status) {
  if (role === "ADMIN") {
    if (status === PostStatus.IN_REVIEW) {
      return {
        title: "现在要做流程判断",
        description:
          "这篇文章已经写完并进入待审核。管理员现在要决定是通过发布，还是带着明确说明退回给编辑继续改。",
      };
    }

    if (status === PostStatus.PUBLISHED) {
      return {
        title: "现在是公开中的内容",
        description:
          "这篇文章已经在前台公开。只有在确实要下线或重做流程时，才把它转回草稿。",
      };
    }

    return {
      title: "现在更适合准备下一步",
      description:
        "管理员可以先继续调整内容，也可以把它推进到审核或发布流程里。重点是决定它下一步该进入哪一段工作流。",
    };
  }

  if (status === PostStatus.IN_REVIEW) {
    return {
      title: "现在主要是等审核结果",
      description:
        "这篇文章已经提交出去。你如果发现还要改，可以先撤回到草稿，再继续整理内容。",
    };
  }

  if (status === PostStatus.REJECTED) {
    return {
      title: "现在先按驳回意见改",
      description:
        "先把问题改完，再重新提交审核。驳回不是结束，而是把修改意见带回写作阶段。",
    };
  }

  if (status === PostStatus.PUBLISHED) {
    return {
      title: "现在是公开内容的维护阶段",
      description:
        "你可以继续改正文，但不能直接重新发布。保存后它会先退出公开流程，再重新进入审核。",
    };
  }

  return {
    title: "现在先把内容写稳",
    description:
      "草稿阶段最重要的是把标题、摘要和正文整理清楚。准备好了，再提交审核。",
  };
}

export function canSubmitForReview(status) {
  return status === PostStatus.DRAFT || status === PostStatus.REJECTED;
}

export function canApprove(status) {
  return status === PostStatus.IN_REVIEW;
}

export function canReject(status) {
  return status === PostStatus.IN_REVIEW;
}

export function canMoveToDraft(role, status) {
  if (role === "ADMIN") {
    return status !== PostStatus.DRAFT;
  }

  return status === PostStatus.IN_REVIEW || status === PostStatus.REJECTED;
}