import { ensureSampleMemory } from "@/features/memories/apis/memories";
import { createUserGroup, getOwnedUserGroup } from "@/features/groups/apis/userGroups";
import { auth, storage } from "@/firebase/config";
import { sampleGroup, sampleMemories, saveSampleVault, type SampleVaultDraft } from "@/features/groups/utils/sampleVaultFlow";
import { sampleVaultStage } from "@/features/groups/utils/sampleVaultError";

export type { SampleVaultDraft } from "@/features/groups/utils/sampleVaultFlow";

async function samplePhotos(): Promise<File[]> {
  const response = await fetch("/friendship-contact-sheet.png");
  if (!response.ok) throw new Error("Could not load the sample photos. Try again.");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const halfWidth = Math.floor(bitmap.width / 2);
    const halfHeight = Math.floor(bitmap.height / 2);
    const canvas = document.createElement("canvas");
    canvas.width = halfWidth - 4;
    canvas.height = halfHeight - 4;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the sample photos. Try again.");
    const photos: File[] = [];
    for (const memory of sampleMemories) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, memory.column * halfWidth + 2, memory.row * halfHeight + 2, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not prepare the sample photos. Try again.")), "image/jpeg", 0.88));
      photos.push(new File([blob], `sample-${memory.column}-${memory.row}.jpg`, { type: "image/jpeg" }));
    }
    return photos;
  } finally {
    bitmap.close();
  }
}

export async function createSampleVault(displayName: string, draft: SampleVaultDraft): Promise<{ groupId: string; photosSkipped: boolean }> {
  if (!auth?.currentUser) throw new Error("Sign in before creating a sample vault.");
  const photos = storage ? await sampleVaultStage("prepare-photos", samplePhotos) : sampleMemories.map(() => null);
  let photosSkipped = false;
  const groupId = await saveSampleVault(draft, auth.currentUser.uid, displayName, photos, {
    getGroup: (groupId) => sampleVaultStage("check-existing-vault", () => getOwnedUserGroup(groupId)),
    createGroup: async (sampleDraft) => { await sampleVaultStage("create-vault", () => createUserGroup(sampleGroup.name, sampleGroup.description, sampleDraft.id, sampleDraft.createdAt, sampleGroup.coverImage)); },
    ensureMemory: async (groupId, memoryId, memory, photo, name) => {
      photosSkipped = await ensureSampleMemory(groupId, memoryId, { title: memory.title, description: memory.description, memoryDate: memory.memoryDate, location: memory.location, image: photo, displayName: name }) || photosSkipped;
    },
  });
  return { groupId, photosSkipped };
}
