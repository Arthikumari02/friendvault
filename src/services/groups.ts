import {
  mockGroupMembers,
  mockGroups,
  mockMemories,
  mockUsers,
} from "@/services/mockData";
import type { Group, GroupSummary } from "@/types";

function yearsSince(value: string) {
  return Math.max(1, new Date().getFullYear() - new Date(value).getFullYear());
}

export async function getGroupsForUser(userId = "user-1"): Promise<GroupSummary[]> {
  const memberGroupIds = new Set(
    mockGroupMembers
      .filter((member) => member.userId === userId)
      .map((member) => member.groupId),
  );

  return mockGroups
    .filter((group) => memberGroupIds.has(group.id))
    .map((group) => {
      const memories = mockMemories
        .filter((memory) => memory.groupId === group.id)
        .sort((a, b) => new Date(b.memoryDate).getTime() - new Date(a.memoryDate).getTime());
      const lastActivity = memories
        .map((memory) => memory.createdAt)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const memberAvatars = mockGroupMembers
        .filter((member) => member.groupId === group.id)
        .map((member) => mockUsers.find((user) => user.id === member.userId)?.initials ?? "FR");
      const latestMemory = memories[0];

      return {
        ...group,
        memberCount: memberAvatars.length,
        totalMemories: memories.length,
        lastActivity: lastActivity ?? group.createdAt,
        yearsTogether: yearsSince(group.createdAt),
        memberAvatars,
        latestMemory: latestMemory
          ? {
              ...latestMemory,
              uploadedByName:
                mockUsers.find((user) => user.id === latestMemory.uploadedBy)?.name ?? "Friend",
            }
          : undefined,
      };
    });
}

export async function getGroupById(groupId: string): Promise<Group | undefined> {
  return mockGroups.find((group) => group.id === groupId);
}

export async function getGroupMemberCount(groupId: string): Promise<number> {
  return mockGroupMembers.filter((member) => member.groupId === groupId).length;
}

export async function getGroupAvatars(groupId: string): Promise<string[]> {
  return mockGroupMembers
    .filter((member) => member.groupId === groupId)
    .map((member) => mockUsers.find((user) => user.id === member.userId)?.initials ?? "FR");
}
