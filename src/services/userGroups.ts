import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { Group, GroupSummary } from "@/types";

function requireDatabase() {
  if (!db || !auth?.currentUser) {
    throw new Error("Sign in and configure Firebase before creating a group.");
  }
  return { database: db, userId: auth.currentUser.uid };
}

function readGroup(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Untitled group",
    description: typeof data.description === "string" ? data.description : "",
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
    coverCaption: typeof data.coverCaption === "string" ? data.coverCaption : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
  };
}

export async function createUserGroup(name: string, description: string, groupId: string, createdAt: string): Promise<string> {
  const { database, userId } = requireDatabase();
  await setDoc(doc(database, "groups", groupId), {
    name: name.trim(),
    description: description.trim(),
    coverImage: "from-indigo-300 via-purple-200 to-amber-100",
    createdBy: userId,
    createdAt,
  });
  return groupId;
}

export async function getUserGroups(userId: string, initials = "FR"): Promise<GroupSummary[]> {
  const { database, userId: signedInUserId } = requireDatabase();
  if (userId !== signedInUserId) throw new Error("Sign in to view your groups.");

  const snapshot = await getDocs(query(collection(database, "groups"), where("createdBy", "==", userId)));
  return snapshot.docs
    .map((item) => readGroup(item.id, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((group) => ({
      ...group,
      memberCount: 1,
      totalMemories: 0,
      lastActivity: group.createdAt,
      yearsTogether: Math.max(0, new Date().getFullYear() - new Date(group.createdAt).getFullYear()),
      memberAvatars: [initials],
    }));
}

export async function getUserGroup(groupId: string): Promise<Group | null> {
  const { database, userId } = requireDatabase();
  const snapshot = await getDoc(doc(database, "groups", groupId));
  if (!snapshot.exists()) return null;
  const group = readGroup(snapshot.id, snapshot.data());
  return group.createdBy === userId ? group : null;
}

export function getGroupErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      if (/Cloud Firestore API.*(disabled|not been used)/i.test(error.message)) {
        return "Cloud Firestore is disabled for this Firebase project. Enable the API, create a Firestore database, then try again.";
      }
      return "Firestore denied access. Check that the Cloud Firestore API and database are enabled and that the owner rules are published.";
    }
    if (error.code === "not-found") {
      return "The default Firestore database does not exist. Create it in your Firebase project, publish the owner rules, then try again.";
    }
    if (error.code === "unavailable" || error.code === "failed-precondition") {
      return "Firestore is unavailable. Check your connection and Firestore database, then try again.";
    }
  }
  return error instanceof Error ? error.message : "Could not save the group. Try again.";
}
