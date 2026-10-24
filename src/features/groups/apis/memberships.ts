import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { Group, GroupInvitation, GroupMember } from "@/types";

function session() {
  if (!db || !auth?.currentUser) throw new Error("Sign in to manage group membership.");
  return { database: db, user: auth.currentUser };
}

export async function getMembers(group: Group): Promise<GroupMember[]> {
  const { database } = session();
  const snapshot = await getDocs(collection(database, "groups", group.id, "members"));
  const owner: GroupMember = { groupId: group.id, userId: group.createdBy, role: "owner", displayName: "Group owner", joinedAt: group.createdAt };
  return [owner, ...snapshot.docs.filter((item) => item.id !== group.createdBy).map((item) => ({
    groupId: group.id, userId: item.id,
    role: item.data().role === "admin" ? "admin" as const : "member" as const,
    displayName: typeof item.data().displayName === "string" ? item.data().displayName : "Friend",
    joinedAt: typeof item.data().joinedAt === "string" ? item.data().joinedAt : group.createdAt,
  }))];
}

export async function getMyRole(group: Group): Promise<GroupMember["role"] | null> {
  const { database, user } = session();
  if (group.createdBy === user.uid) return "owner";
  const snapshot = await getDoc(doc(database, "groups", group.id, "members", user.uid));
  return snapshot.exists() ? snapshot.data().role === "admin" ? "admin" : "member" : null;
}

export async function sendInvitation(groupId: string, inviteeId: string) {
  const { database, user } = session();
  const uid = inviteeId.trim();
  if (!/^[A-Za-z0-9]{20,128}$/.test(uid)) throw new Error("Enter a valid FriendVault user ID.");
  if (uid === user.uid) throw new Error("You already belong to this group.");
  await setDoc(doc(database, "groups", groupId, "invitations", uid), {
    inviteeId: uid, invitedBy: user.uid, createdAt: new Date().toISOString(),
  });
}

export async function getPendingInvitations(groupId: string): Promise<GroupInvitation[]> {
  const { database } = session();
  const snapshot = await getDocs(collection(database, "groups", groupId, "invitations"));
  return snapshot.docs.map((item) => ({ groupId, inviteeId: item.id, invitedBy: item.data().invitedBy, createdAt: item.data().createdAt }));
}

export async function cancelInvitation(groupId: string, inviteeId: string): Promise<void> {
  const { database } = session();
  await deleteDoc(doc(database, "groups", groupId, "invitations", inviteeId));
}

export async function getMyInvitation(groupId: string): Promise<GroupInvitation | null> {
  const { database, user } = session();
  const snapshot = await getDoc(doc(database, "groups", groupId, "invitations", user.uid));
  return snapshot.exists() ? { groupId, inviteeId: user.uid, invitedBy: snapshot.data().invitedBy, createdAt: snapshot.data().createdAt } : null;
}

export async function acceptInvitation(groupId: string, displayName: string) {
  const { database, user } = session();
  const name = displayName.trim().slice(0, 100) || "Friend";
  const batch = writeBatch(database);
  batch.set(doc(database, "groups", groupId, "members", user.uid), {
    userId: user.uid, groupId, role: "member", displayName: name, joinedAt: new Date().toISOString(),
  });
  batch.delete(doc(database, "groups", groupId, "invitations", user.uid));
  await batch.commit();
}

export async function rejectInvitation(groupId: string) {
  const { database, user } = session();
  await deleteDoc(doc(database, "groups", groupId, "invitations", user.uid));
}

export async function changeMemberRole(groupId: string, userId: string, role: "admin" | "member") {
  const { database } = session();
  await updateDoc(doc(database, "groups", groupId, "members", userId), { role });
}

export async function removeMember(groupId: string, userId: string) {
  const { database } = session();
  await deleteDoc(doc(database, "groups", groupId, "members", userId));
}
