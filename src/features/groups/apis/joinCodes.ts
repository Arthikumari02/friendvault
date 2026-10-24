import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

function session() {
  if (!db || !auth?.currentUser) throw new Error("Sign in to use vault codes.");
  return { database: db, user: auth.currentUser };
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function setJoinCode(groupId: string, previousCode?: string): Promise<string> {
  const { database, user } = session();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    if (code === previousCode) continue;
    const groupRef = doc(database, "groups", groupId);
    const codeRef = doc(database, "joinCodes", code);
    const oldRef = previousCode ? doc(database, "joinCodes", previousCode) : null;
    try {
      await runTransaction(database, async (transaction) => {
        const group = await transaction.get(groupRef);
        const existing = await transaction.get(codeRef);
        const oldCode = oldRef ? await transaction.get(oldRef) : null;
        if (!group.exists() || group.data().createdBy !== user.uid) throw new Error("Only the vault owner can change its code.");
        if (existing.exists()) throw new Error("Code already in use.");
        if ((group.data().inviteCode || "") !== (previousCode || "")) throw new Error("The vault code changed. Reload and try again.");
        transaction.update(groupRef, { inviteCode: code });
        transaction.set(codeRef, { groupId, createdBy: user.uid });
        if (oldRef && oldCode?.exists()) transaction.delete(oldRef);
      });
      return code;
    } catch (error) {
      if (error instanceof Error && error.message === "Code already in use.") continue;
      throw error;
    }
  }
  throw new Error("Could not generate a unique code. Try again.");
}

export async function joinWithCode(input: string, displayName: string): Promise<string> {
  const { database, user } = session();
  const code = input.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new Error("Enter an 8-character vault code.");
  const codeSnapshot = await getDoc(doc(database, "joinCodes", code));
  if (!codeSnapshot.exists()) throw new Error("That code was not found. Ask your friend for a new code.");
  const groupId = codeSnapshot.data().groupId;
  if (typeof groupId !== "string") throw new Error("That code is invalid.");
  await setDoc(doc(database, "groups", groupId, "members", user.uid), {
    userId: user.uid,
    groupId,
    role: "member",
    displayName: displayName.trim().slice(0, 100) || "Friend",
    joinedAt: new Date().toISOString(),
    joinCode: code,
  });
  return groupId;
}
