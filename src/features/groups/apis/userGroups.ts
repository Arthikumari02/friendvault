import { FirebaseError } from "firebase/app";
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db, storage } from "@/firebase/config";
import { deleteObject, getMetadata, ref, type FirebaseStorage } from "firebase/storage";
import { validateGroup } from "@/features/groups/utils/validateGroup";
import { commitVaultDeletionAfterPreflight } from "@/features/groups/utils/commitVaultDeletionAfterPreflight";
import { GroupListStepError, groupListErrorCode, groupListErrorMessage, groupListStep, isJoinedMembershipIndexError } from "@/features/groups/utils/groupListError";
import type { Group, GroupMember, GroupSummary, MemoryWithUser } from "@/types";
import { getMembers } from "@/features/groups/apis/memberships";
import { getMemoriesForGroup } from "@/features/memories/apis/memories";
import { cleanupCloudinaryVaultPhotos } from "@/features/memories/apis/cloudinaryPhotos";
import { parseMemoryPhotos, photoBelongsToMemory } from "@/features/memories/utils/memoryPhotos";

function requireDatabase() {
  if (!db || !auth) throw new Error("Firebase is not configured. Check the NEXT_PUBLIC_FIREBASE settings and restart the app.");
  if (!auth.currentUser) throw new Error("Sign in to access your vaults.");
  return { database: db, userId: auth.currentUser.uid };
}

function readGroup(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Untitled group",
    description: typeof data.description === "string" ? data.description : "",
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
    coverCaption: typeof data.coverCaption === "string" ? data.coverCaption : undefined,
    inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
  };
}

export async function createUserGroup(name: string, description: string, groupId: string, createdAt: string, coverImage = "from-indigo-300 via-purple-200 to-amber-100"): Promise<string> {
  const { database, userId } = requireDatabase();
  await setDoc(doc(database, "groups", groupId), {
    name: name.trim(),
    description: description.trim(),
    coverImage,
    createdBy: userId,
    createdAt,
  });
  return groupId;
}

export async function getOwnedUserGroup(groupId: string): Promise<Group | null> {
  const { database, userId } = requireDatabase();
  // A direct get of a missing group is denied by owner-only Firestore rules.
  // The owner-scoped list query is permitted for both existing and missing IDs.
  const owned = await getDocs(query(collection(database, "groups"), where("createdBy", "==", userId)));
  const match = owned.docs.find((item) => item.id === groupId);
  return match ? readGroup(match.id, match.data()) : null;
}

export async function updateUserGroup(groupId: string, name: string, description: string): Promise<void> {
  const { database, userId } = requireDatabase();
  const errors = validateGroup(name, description);
  if (errors.nameError || errors.descriptionError) throw new Error(errors.nameError || errors.descriptionError);
  const group = await getUserGroup(groupId);
  if (!group || group.createdBy !== userId) throw new Error("Only the group owner can edit this group.");
  await updateDoc(doc(database, "groups", groupId), { name: name.trim(), description: description.trim() });
}

type DeletionStage = "read-vault" | "check-owner" | "list-memories" | "list-members" | "list-invitations" | "read-photo-metadata" | "read-code" | "delete-firestore" | "delete-photo" | "clear-cleanup-job";

class VaultDeletionStepError extends Error {
  constructor(readonly stage: DeletionStage, readonly cause: unknown) {
    super("Vault deletion failed.");
  }
}

function logDeletionDiagnostic(stage: DeletionStage, error?: unknown, checks?: { documentIdMatchesRoute: boolean; ownerMatchesSession: boolean }) {
  // Keep live diagnostics useful without logging vault IDs, UIDs, names, paths, or Firebase error messages.
  console.info("[FriendVault] Vault deletion", {
    stage,
    ...(checks ?? {}),
    ...(error ? { errorCode: error instanceof FirebaseError ? error.code : error instanceof Error ? error.name : "unknown" } : {}),
  });
}

async function deletionStep<T>(stage: DeletionStage, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    logDeletionDiagnostic(stage, error);
    throw new VaultDeletionStepError(stage, error);
  }
}

function isVaultPhotoPath(groupId: string, path: string): boolean {
  const prefix = `groups/${groupId}/memories/`;
  return path.startsWith(prefix) && /^[^/]+\/image(-[A-Za-z0-9-]+)?$/.test(path.slice(prefix.length));
}

function isVaultCloudPhotoId(groupId: string, publicId: string): boolean {
  const prefix = `friendvault/groups/${groupId}/memories/`;
  if (!publicId.startsWith(prefix)) return false;
  return photoBelongsToMemory(publicId, groupId, publicId.slice(prefix.length).split("/")[0]);
}

async function cleanupVaultPhotos(database: NonNullable<typeof db>, photoStorage: FirebaseStorage | null, groupId: string, imagePaths: string[], cloudinaryPublicIds: string[]): Promise<number> {
  const results = photoStorage ? await Promise.allSettled(imagePaths.map((path) => deleteObject(ref(photoStorage, path)))) : [];
  const storageFailures = results.filter((result) => {
    if (result.status === "fulfilled") return false;
    if (result.reason instanceof FirebaseError && result.reason.code === "storage/object-not-found") return false;
    logDeletionDiagnostic("delete-photo", result.reason);
    return true;
  }).length + (photoStorage ? 0 : imagePaths.length);
  let cloudFailures = 0;
  if (cloudinaryPublicIds.length) {
    try { cloudFailures = await cleanupCloudinaryVaultPhotos(groupId); }
    catch (error) { logDeletionDiagnostic("delete-photo", error); cloudFailures = cloudinaryPublicIds.length; }
  }
  if (storageFailures + cloudFailures) return storageFailures + cloudFailures;
  try {
    await deleteDoc(doc(database, "vaultDeletionJobs", groupId));
    return 0;
  } catch (error) {
    logDeletionDiagnostic("clear-cleanup-job", error);
    return 1;
  }
}

export async function retryPendingVaultPhotoCleanup(): Promise<number> {
  const { database, userId } = requireDatabase();
  const jobs = await getDocs(query(collection(database, "vaultDeletionJobs"), where("ownerId", "==", userId)));
  if (jobs.empty) return 0;
  let failures = 0;
  for (const job of jobs.docs) {
    const paths = job.data().imagePaths;
    const cloudIds = job.data().cloudinaryPublicIds ?? [];
    if (!Array.isArray(paths) || !Array.isArray(cloudIds) || !paths.length && !cloudIds.length
      || !paths.every((path): path is string => typeof path === "string" && isVaultPhotoPath(job.id, path))
      || !cloudIds.every((id): id is string => typeof id === "string" && isVaultCloudPhotoId(job.id, id))) {
      failures += 1;
      continue;
    }
    failures += await cleanupVaultPhotos(database, storage, job.id, paths, cloudIds);
  }
  return failures;
}

export async function deleteUserGroup(groupId: string): Promise<{ cleanupFailures: number }> {
  const { database, userId } = requireDatabase();
  const photoStorage = storage;
  const { imagePaths, cloudinaryPublicIds } = await commitVaultDeletionAfterPreflight(async () => {
    const group = await deletionStep("read-vault", () => getUserGroup(groupId));
    logDeletionDiagnostic("check-owner", undefined, {
      documentIdMatchesRoute: group?.id === groupId,
      ownerMatchesSession: group?.createdBy === userId,
    });
    if (!group) throw new Error("Vault not found. It may already have been deleted.");
    if (group.id !== groupId || group.createdBy !== userId) throw new Error("Only the vault owner can delete this vault.");
    const memories = await deletionStep("list-memories", () => getDocs(collection(database, "groups", groupId, "memories")));
    const members = await deletionStep("list-members", () => getDocs(collection(database, "groups", groupId, "members")));
    const invitations = await deletionStep("list-invitations", () => getDocs(collection(database, "groups", groupId, "invitations")));
    const children = [...memories.docs, ...members.docs, ...invitations.docs];
    if (children.length > 400) throw new Error("This group is too large to delete safely here. Contact support for a server-side deletion.");
    const imagePaths = memories.docs.map((item) => item.data().imagePath).filter((value): value is string => typeof value === "string" && value.length > 0);
    const cloudinaryPublicIds = memories.docs.flatMap((item) => parseMemoryPhotos(item.data().photos, groupId, item.id).map((photo) => photo.publicId));
    if (imagePaths.length && !photoStorage) throw new Error("Firebase Storage is not configured. The group was not deleted.");
    if (photoStorage) {
      for (const path of imagePaths) {
        if (!isVaultPhotoPath(groupId, path)) throw new Error("A memory has an unexpected image path. The group was not deleted.");
        const metadata = await deletionStep("read-photo-metadata", () => getMetadata(ref(photoStorage, path)));
        if (metadata.customMetadata?.groupOwner !== userId) {
          throw new Error("An older photo needs manual cleanup before this group can be deleted safely.");
        }
      }
    }
    let joinCodeToDelete: string | null = null;
    const inviteCode = group.inviteCode;
    if (inviteCode) {
      const code = await deletionStep("read-code", () => getDoc(doc(database, "joinCodes", inviteCode)));
      if (code.exists() && code.data().groupId === groupId) joinCodeToDelete = inviteCode;
    }
    return { children, imagePaths, cloudinaryPublicIds, joinCodeToDelete };
  }, async ({ children, imagePaths, cloudinaryPublicIds, joinCodeToDelete }) => {
    const batch = writeBatch(database);
    children.forEach((item) => batch.delete(item.ref));
    if (joinCodeToDelete) batch.delete(doc(database, "joinCodes", joinCodeToDelete));
    if (imagePaths.length || cloudinaryPublicIds.length) batch.set(doc(database, "vaultDeletionJobs", groupId), { ownerId: userId, imagePaths, cloudinaryPublicIds });
    batch.delete(doc(database, "groups", groupId));
    await deletionStep("delete-firestore", () => batch.commit());
  });
  return { cleanupFailures: imagePaths.length || cloudinaryPublicIds.length ? await cleanupVaultPhotos(database, photoStorage, groupId, imagePaths, cloudinaryPublicIds) : 0 };
}

export async function getUserGroups(userId: string, initials = "FR", onWarning?: (message: string) => void): Promise<GroupSummary[]> {
  const { database, userId: signedInUserId } = requireDatabase();
  if (userId !== signedInUserId) throw new Error("Sign in to view your groups.");

  const owned = await groupListStep("list-owned-groups", () => getDocs(query(collection(database, "groups"), where("createdBy", "==", userId))));
  let joined;
  try {
    joined = await groupListStep("list-joined-memberships", () => getDocs(query(collectionGroup(database, "members"), where("userId", "==", userId))));
  } catch (error) {
    if (isJoinedMembershipIndexError(error) && onWarning) {
      onWarning("Owned vaults are shown. Joined vaults need the members.userId collection-group index in Firebase Console → Firestore Database → Indexes.");
    } else if (groupListErrorCode(error) === "permission-denied") {
      onWarning?.("Owned vaults are shown. Joined vaults need the published member-read Firestore rules.");
    } else throw error;
  }
  const groups = owned.docs.map((item) => readGroup(item.id, item.data()));
  for (const membership of joined?.docs ?? []) {
    const groupId = membership.data().groupId;
    if (typeof groupId !== "string" || groups.some((group) => group.id === groupId)) continue;
    const snapshot = await groupListStep("read-joined-group", () => getDoc(doc(database, "groups", groupId)));
    if (snapshot.exists()) groups.push(readGroup(snapshot.id, snapshot.data()));
  }
  return Promise.all(groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(async (group) => {
    let members: GroupMember[];
    let memories: MemoryWithUser[];
    try {
      [members, memories] = await Promise.all([
        groupListStep("list-group-members", () => getMembers(group)),
        groupListStep("list-group-memories", () => getMemoriesForGroup(group.id)),
      ]);
    } catch (error) {
      if (groupListErrorCode(error) !== "permission-denied" || group.createdBy !== userId) throw error;
      members = [{ groupId: group.id, userId, role: "owner" as const, displayName: "You", joinedAt: group.createdAt }];
      memories = [];
    }
    const latestMemory = memories[0];
    return {
      ...group,
      memberCount: members.length,
      totalMemories: memories.length,
      lastActivity: latestMemory?.createdAt ?? group.createdAt,
      yearsTogether: Math.max(0, new Date().getFullYear() - new Date(group.createdAt).getFullYear()),
      memberAvatars: members.map((member) => member.userId === userId ? initials : member.displayName.slice(0, 2).toUpperCase()),
      latestMemory,
    };
  }));
}

export async function getUserGroup(groupId: string): Promise<Group | null> {
  const { database, userId } = requireDatabase();
  const snapshot = await getDoc(doc(database, "groups", groupId));
  if (!snapshot.exists()) return null;
  const group = readGroup(snapshot.id, snapshot.data());
  if (group.createdBy === userId) return group;
  const membership = await getDoc(doc(database, "groups", groupId, "members", userId));
  return membership.exists() ? group : null;
}

export function getGroupErrorMessage(error: unknown): string {
  const groupListMessage = groupListErrorMessage(error);
  if (groupListMessage) return groupListMessage;
  if (error instanceof GroupListStepError) return getGroupErrorMessage(error.cause);
  if (error instanceof VaultDeletionStepError) {
    if (error.stage === "read-photo-metadata" && error.cause instanceof FirebaseError && error.cause.code === "storage/unauthorized") {
      return "Storage denied access to a memory photo. Check the published Storage rules; nothing was deleted.";
    }
    if (error.cause instanceof FirebaseError && error.cause.code === "permission-denied") {
      const blockedReads: Partial<Record<DeletionStage, string>> = {
        "read-vault": "vault",
        "list-memories": "memories",
        "list-members": "members",
        "list-invitations": "invitations",
        "read-code": "join code",
      };
      const blockedRead = blockedReads[error.stage];
      if (blockedRead) return `Cannot read this vault's ${blockedRead}. Check the published Firestore rules for owner access; nothing was deleted.`;
      if (error.stage === "delete-firestore") return "Firestore denied deletion of the vault or one of its related records. Check the published owner delete rules; nothing was deleted.";
      if (error.stage === "read-photo-metadata") return "Storage denied access to a memory photo. Check the published Storage rules; nothing was deleted.";
    }
    return getGroupErrorMessage(error.cause);
  }
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      if (/Cloud Firestore API.*(disabled|not been used)/i.test(error.message)) {
        return "Cloud Firestore is disabled for this Firebase project. Enable the API, create a Firestore database, then try again.";
      }
      return "Access denied. You may need an invitation, or the updated Firestore rules may need to be published.";
    }
    if (error.code === "not-found") {
      return "The default Firestore database does not exist. Create it in your Firebase project, publish the updated rules, then try again.";
    }
    if (error.code === "failed-precondition") {
      return /index/i.test(error.message)
        ? "A Firestore query needs an index. Check Firebase Console → Firestore Database → Indexes, then retry."
        : "Firestore rejected a query (failed precondition). Check the database and query configuration.";
    }
    if (error.code === "unavailable") {
      return "Could not reach Firestore. Check your connection and retry.";
    }
  }
  return error instanceof Error ? error.message : "Could not save the group. Try again.";
}
