import { mockComments, mockMemories, mockReactions, mockUsers } from "@/services/mockData";
import type { Comment, MemoryWithUser, Reaction } from "@/types";

export async function getMemoriesForGroup(groupId: string): Promise<MemoryWithUser[]> {
  return mockMemories
    .filter((memory) => memory.groupId === groupId)
    .sort(
      (a, b) =>
        new Date(b.memoryDate).getTime() - new Date(a.memoryDate).getTime(),
    )
    .map((memory) => ({
      ...memory,
      uploadedByName:
        mockUsers.find((user) => user.id === memory.uploadedBy)?.name ?? "Friend",
    }));
}

export async function getMemoryById(memoryId: string): Promise<MemoryWithUser | undefined> {
  const memory = mockMemories.find((item) => item.id === memoryId);
  if (!memory) return undefined;

  return {
    ...memory,
    uploadedByName:
      mockUsers.find((user) => user.id === memory.uploadedBy)?.name ?? "Friend",
  };
}

export async function getCommentsForMemory(memoryId: string): Promise<Comment[]> {
  return mockComments.filter((comment) => comment.memoryId === memoryId);
}

export async function getReactionsForMemory(memoryId: string): Promise<Reaction[]> {
  return mockReactions.filter((reaction) => reaction.memoryId === memoryId);
}
