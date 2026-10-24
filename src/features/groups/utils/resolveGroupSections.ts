import type { Group, GroupMember, MemoryWithUser } from "@/types";

type Sections = {
  members: GroupMember[];
  memories: MemoryWithUser[];
  membersUnavailable: boolean;
  memoriesUnavailable: boolean;
};

function isPermissionDenied(reason: unknown): boolean {
  return typeof reason === "object" && reason !== null
    && "code" in reason && reason.code === "permission-denied";
}

export function resolveGroupSections(
  group: Group,
  signedInUserId: string,
  membersResult: PromiseSettledResult<GroupMember[]>,
  memoriesResult: PromiseSettledResult<MemoryWithUser[]>,
): Sections {
  const isOwner = Boolean(signedInUserId) && group.createdBy === signedInUserId;
  if (membersResult.status === "rejected" && !(isOwner && isPermissionDenied(membersResult.reason))) {
    throw membersResult.reason;
  }
  if (memoriesResult.status === "rejected" && !(isOwner && isPermissionDenied(memoriesResult.reason))) {
    throw memoriesResult.reason;
  }

  return {
    members: membersResult.status === "fulfilled" ? membersResult.value : [{
      groupId: group.id,
      userId: group.createdBy,
      role: "owner",
      displayName: "Group owner",
      joinedAt: group.createdAt,
    }],
    memories: memoriesResult.status === "fulfilled" ? memoriesResult.value : [],
    membersUnavailable: membersResult.status === "rejected",
    memoriesUnavailable: memoriesResult.status === "rejected",
  };
}
