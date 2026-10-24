import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getBlob, getMetadata, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/firebase/config";
import { validateMemory } from "@/features/memories/utils/validateMemory";
import { sampleVaultStage } from "@/features/groups/utils/sampleVaultError";
import { deleteMemoryPhoto } from "@/features/memories/apis/cloudinaryPhotos";
import { MAX_MEMORY_PHOTOS, parseMemoryPhotos, photoBelongsToMemory, type MemoryPhoto } from "@/features/memories/utils/memoryPhotos";
import type { MemoryWithUser } from "@/types";

function session() {
  if (!db || !auth?.currentUser) throw new Error("Sign in to access memories.");
  return { database: db, user: auth.currentUser };
}

async function readMemory(id: string, groupId: string, data: Record<string, unknown>): Promise<MemoryWithUser> {
  let imageUrl: string | undefined;
  const imagePath = typeof data.imagePath === "string" ? data.imagePath : "";
  if (imagePath && storage) {
    try { imageUrl = URL.createObjectURL(await getBlob(ref(storage, imagePath), 10 * 1024 * 1024)); }
    catch { imageUrl = undefined; }
  }
  return {
    id, groupId,
    title: typeof data.title === "string" ? data.title : "Untitled memory",
    description: typeof data.description === "string" ? data.description : "",
    location: typeof data.location === "string" ? data.location : undefined,
    imagePath, imageUrl,
    photos: parseMemoryPhotos(data.photos, groupId, id),
    uploadedBy: typeof data.uploadedBy === "string" ? data.uploadedBy : "",
    uploadedByName: typeof data.uploadedByName === "string" ? data.uploadedByName : "Friend",
    memoryDate: typeof data.memoryDate === "string" ? data.memoryDate : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
  };
}

export async function getMemoriesForGroup(groupId: string): Promise<MemoryWithUser[]> {
  const { database } = session();
  const snapshot = await getDocs(collection(database, "groups", groupId, "memories"));
  const memories = await Promise.all(snapshot.docs.map((item) => readMemory(item.id, groupId, item.data())));
  return memories.sort((a, b) => b.memoryDate.localeCompare(a.memoryDate));
}

export async function getMemoryById(groupId: string, memoryId: string): Promise<MemoryWithUser | null> {
  const { database } = session();
  const snapshot = await getDoc(doc(database, "groups", groupId, "memories", memoryId));
  return snapshot.exists() ? await readMemory(snapshot.id, groupId, snapshot.data()) : null;
}

export type MemoryInput = { title: string; description: string; memoryDate: string; location: string; image?: File | null; photos?: MemoryPhoto[]; displayName: string };

function checkedPhotos(photos: MemoryPhoto[] | undefined, groupId: string, memoryId: string): MemoryPhoto[] {
  const result = photos ?? [];
  if (result.length > MAX_MEMORY_PHOTOS || result.some((photo) => !photoBelongsToMemory(photo.publicId, groupId, memoryId))) {
    throw new Error(`Choose no more than ${MAX_MEMORY_PHOTOS} photos for this memory.`);
  }
  return result;
}

async function uploadMemoryImage(groupId: string, memoryId: string, image: File, ownerId: string, authorId: string, memoryAuthorId: string): Promise<string> {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  const imageRef = ref(storage, `groups/${groupId}/memories/${memoryId}/image-${crypto.randomUUID()}`);
  await uploadBytes(imageRef, image, { contentType: image.type, customMetadata: { groupOwner: ownerId, uploadedBy: authorId, memoryAuthor: memoryAuthorId } });
  return imageRef.fullPath;
}

async function getGroupOwner(groupId: string): Promise<string> {
  const { database } = session();
  const snapshot = await getDoc(doc(database, "groups", groupId));
  if (!snapshot.exists()) throw new Error("Group not found.");
  return snapshot.data().createdBy;
}

export async function createMemory(groupId: string, input: MemoryInput, memoryId = crypto.randomUUID()): Promise<{ id: string; photoSkipped: boolean }> {
  const { database, user } = session();
  const validation = validateMemory({ ...input, image: input.image ?? null });
  if (validation) throw new Error(validation);
  const id = memoryId;
  const photos = checkedPhotos(input.photos, groupId, id);
  let imagePath = "";
  let photoSkipped = false;
  if (input.image) {
    if (storage) {
      const ownerId = await getGroupOwner(groupId);
      try {
        imagePath = await uploadMemoryImage(groupId, id, input.image, ownerId, user.uid, user.uid);
      } catch (error) {
        console.info("[FriendVault] Memory photo unavailable", { operation: "create", errorCode: error instanceof Error && "code" in error ? error.code : "unknown" });
        photoSkipped = true;
      }
    } else photoSkipped = true;
  }
  try {
    await setDoc(doc(database, "groups", groupId, "memories", id), {
      title: input.title.trim(), description: input.description.trim(), memoryDate: input.memoryDate,
      location: input.location.trim(), imagePath, photos, uploadedBy: user.uid,
      uploadedByName: input.displayName.trim().slice(0, 100) || "Friend", createdAt: new Date().toISOString(),
    });
    return { id, photoSkipped };
  } catch (error) {
    if (imagePath && storage) await deleteObject(ref(storage, imagePath)).catch(() => undefined);
    throw error;
  }
}

export async function ensureSampleMemory(groupId: string, memoryId: string, input: MemoryInput): Promise<boolean> {
  const { database, user } = session();
  const validation = validateMemory({ ...input, image: input.image ?? null });
  if (validation) throw new Error(validation);
  const memoryRef = doc(database, "groups", groupId, "memories", memoryId);
  const existing = await sampleVaultStage("read-memory", () => getDoc(memoryRef));
  if (existing.exists()) {
    if (existing.data().uploadedBy !== user.uid) throw new Error("This sample memory belongs to another account.");
    return !existing.data().imagePath;
  }
  const ownerId = await sampleVaultStage("read-vault-owner", () => getGroupOwner(groupId));
  console.info("[FriendVault] Sample memory ownership check", { stage: "check-owner", ownerMatchesSession: ownerId === user.uid });
  if (ownerId !== user.uid) throw new Error("Only the vault owner can create its sample memories.");
  let imagePath = "";
  if (input.image && storage) {
    const imageRef = ref(storage, `groups/${groupId}/memories/${memoryId}/image-sample`);
    try {
      try { await getMetadata(imageRef); }
      catch (error) {
        if ((error as { code?: string }).code !== "storage/object-not-found") throw error;
        await uploadBytes(imageRef, input.image, { contentType: input.image.type, customMetadata: { groupOwner: ownerId, uploadedBy: user.uid, memoryAuthor: user.uid } });
      }
      imagePath = imageRef.fullPath;
    } catch (error) {
      console.info("[FriendVault] Sample photo unavailable", { errorCode: error instanceof Error && "code" in error ? error.code : "unknown" });
    }
  }
  await sampleVaultStage("write-memory", () => setDoc(memoryRef, {
    title: input.title.trim(), description: input.description.trim(), memoryDate: input.memoryDate,
    location: input.location.trim(), imagePath, uploadedBy: user.uid,
    uploadedByName: input.displayName.trim().slice(0, 100) || "Friend", createdAt: new Date().toISOString(),
  }));
  return !imagePath;
}

export async function updateMemory(groupId: string, memoryId: string, input: MemoryInput): Promise<{ cleanupFailed: boolean; photoSkipped: boolean }> {
  const { database, user } = session();
  const validation = validateMemory({ ...input, image: input.image ?? null });
  if (validation) throw new Error(validation);
  const memoryRef = doc(database, "groups", groupId, "memories", memoryId);
  const snapshot = await getDoc(memoryRef);
  if (!snapshot.exists()) throw new Error("Memory not found.");
  const ownerId = await getGroupOwner(groupId);
  if (snapshot.data().uploadedBy !== user.uid && ownerId !== user.uid) throw new Error("Only the author or group owner can edit this memory.");
  const oldPath = typeof snapshot.data().imagePath === "string" ? snapshot.data().imagePath : "";
  const oldPhotos = parseMemoryPhotos(snapshot.data().photos, groupId, memoryId);
  const photos = input.photos ? checkedPhotos(input.photos, groupId, memoryId) : oldPhotos;
  let newPath = "";
  let photoSkipped = false;
  if (input.image) {
    if (storage) {
      try { newPath = await uploadMemoryImage(groupId, memoryId, input.image, ownerId, user.uid, snapshot.data().uploadedBy); }
      catch (error) {
        console.info("[FriendVault] Memory photo unavailable", { operation: "update", errorCode: error instanceof Error && "code" in error ? error.code : "unknown" });
        photoSkipped = true;
      }
    } else photoSkipped = true;
  }
  try {
    await updateDoc(memoryRef, {
      title: input.title.trim(), description: input.description.trim(), memoryDate: input.memoryDate,
      location: input.location.trim(), imagePath: newPath || oldPath, photos,
    });
  } catch (error) {
    if (newPath && storage) await deleteObject(ref(storage, newPath)).catch(() => undefined);
    throw error;
  }
  const removedPhotos = oldPhotos.filter((photo) => !photos.some((item) => item.publicId === photo.publicId));
  const cloudCleanup = await Promise.allSettled(removedPhotos.map((photo) => deleteMemoryPhoto(groupId, memoryId, photo)));
  const cloudCleanupFailed = cloudCleanup.some((result) => result.status === "rejected");
  if (newPath && oldPath && storage) {
    try { await deleteObject(ref(storage, oldPath)); }
    catch { return { cleanupFailed: true, photoSkipped }; }
  }
  return { cleanupFailed: cloudCleanupFailed, photoSkipped };
}

export async function deleteMemory(groupId: string, memoryId: string): Promise<{ cleanupFailed: boolean }> {
  const { database, user } = session();
  const memoryRef = doc(database, "groups", groupId, "memories", memoryId);
  const snapshot = await getDoc(memoryRef);
  if (!snapshot.exists()) throw new Error("Memory not found.");
  const ownerId = await getGroupOwner(groupId);
  if (snapshot.data().uploadedBy !== user.uid && ownerId !== user.uid) throw new Error("Only the author or group owner can delete this memory.");
  const imagePath = typeof snapshot.data().imagePath === "string" ? snapshot.data().imagePath : "";
  const photos = parseMemoryPhotos(snapshot.data().photos, groupId, memoryId);
  await deleteDoc(memoryRef);
  const cloudCleanup = await Promise.allSettled(photos.map((photo) => deleteMemoryPhoto(groupId, memoryId, photo)));
  const cloudCleanupFailed = cloudCleanup.some((result) => result.status === "rejected");
  if (imagePath && storage) {
    try { await deleteObject(ref(storage, imagePath)); }
    catch { return { cleanupFailed: true }; }
  }
  return { cleanupFailed: cloudCleanupFailed || Boolean(imagePath && !storage) };
}
