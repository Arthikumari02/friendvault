import type { Group } from "@/types";

export type SampleVaultDraft = { id: string; createdAt: string };

export function parseSampleVaultDraft(value: unknown): SampleVaultDraft | null {
  if (typeof value !== "object" || value === null || !("id" in value) || !("createdAt" in value)) return null;
  const { id, createdAt } = value;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) return null;
  return { id, createdAt };
}

export const sampleGroup = {
  name: "The Lake House Crew",
  description: "Ten summers, one leaky canoe, and far too many sunsets.",
  coverImage: "/lake-vault-cover.png",
} as const;

export const sampleMemories = [
  { title: "First lake summer", description: "The beginning of all those summers together", memoryDate: "2016-07-16", location: "The lake house", column: 0, row: 0 },
  { title: "Rooftop birthday", description: "Maya turns 25 and the candles refuse to light", memoryDate: "2019-05-02", location: "Brooklyn, NY", column: 1, row: 0 },
  { title: "Road trip to the coast", description: "Seven hours, one playlist, zero regrets", memoryDate: "2021-09-18", location: "Highway 1, CA", column: 0, row: 1 },
  { title: "Kitchen dinner night", description: "Pasta for nine in a kitchen built for two", memoryDate: "2023-12-21", location: "Sam's apartment", column: 1, row: 1 },
] as const;

type SampleMemory = (typeof sampleMemories)[number];

export type SampleVaultPersistence<Photo> = {
  getGroup: (groupId: string) => Promise<Group | null>;
  createGroup: (draft: SampleVaultDraft) => Promise<void>;
  ensureMemory: (groupId: string, memoryId: string, memory: SampleMemory, photo: Photo | null, displayName: string) => Promise<void>;
};

export function isResumableSampleGroup(group: Group | null, draft: SampleVaultDraft, ownerId: string): group is Group {
  return group?.id === draft.id && group.createdBy === ownerId
    && group.name === sampleGroup.name && group.coverImage === sampleGroup.coverImage;
}

export async function saveSampleVault<Photo>(
  draft: SampleVaultDraft,
  ownerId: string,
  displayName: string,
  photos: (Photo | null)[],
  persistence: SampleVaultPersistence<Photo>,
): Promise<string> {
  if (photos.length !== sampleMemories.length) throw new Error("The sample photos could not be prepared. Try again.");
  const existing = await persistence.getGroup(draft.id);
  console.info("[FriendVault] Sample vault ownership check", { stage: "check-owner", existingVault: Boolean(existing), ownerMatchesSession: existing ? existing.createdBy === ownerId : null });
  if (existing && !isResumableSampleGroup(existing, draft, ownerId)) {
    throw new Error("This vault ID is already in use. Please reload and try again.");
  }
  if (!existing) await persistence.createGroup(draft);
  for (const [index, memory] of sampleMemories.entries()) {
    await persistence.ensureMemory(draft.id, `sample-${index}`, memory, photos[index], displayName);
  }
  return draft.id;
}
