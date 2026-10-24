import type { Group, GroupMember, MemoryWithUser } from "@/types";

export type PreparedGroupDetails = {
  group: Group;
  members: GroupMember[];
  role: GroupMember["role"];
  memories: MemoryWithUser[];
  membersUnavailable: boolean;
  memoriesUnavailable: boolean;
};

let prepared: { userId: string; details: PreparedGroupDetails } | null = null;

export function setPreparedGroupDetails(userId: string, details: PreparedGroupDetails) {
  prepared = { userId, details };
}

export function getPreparedGroupDetails(userId: string | undefined, groupId: string): PreparedGroupDetails | null {
  const current = prepared;
  return current && current.userId === userId && current.details.group.id === groupId ? current.details : null;
}

export function clearPreparedGroupDetails(groupId: string) {
  if (prepared?.details.group.id === groupId) prepared = null;
}
