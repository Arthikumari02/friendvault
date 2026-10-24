import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, collectionGroup, doc, getDoc, getDocs, query, setDoc, deleteDoc, updateDoc, where, writeBatch } from "firebase/firestore";

const host = process.env.FIRESTORE_EMULATOR_HOST;

test("Firestore group, invitation, membership, and memory authorization", { skip: !host && "Set FIRESTORE_EMULATOR_HOST and start the Firestore emulator" }, async (t) => {
  const [emulatorHost, portText] = host.split(":");
  const env = await initializeTestEnvironment({
    projectId: `friendvault-rules-${Date.now()}`,
    firestore: { host: emulatorHost, port: Number(portText), rules: fs.readFileSync("firestore.rules", "utf8") },
  });
  try {
    const groupId = "test-group";
    const groupPath = `groups/${groupId}`;
    const invitationPath = `${groupPath}/invitations/memberuid12345678901234567890`;
    const membershipPath = `${groupPath}/members/memberuid12345678901234567890`;
    const memoryPath = `${groupPath}/memories/test-memory`;
    const owner = env.authenticatedContext("owneruid12345678901234567890").firestore();
    const member = env.authenticatedContext("memberuid12345678901234567890").firestore();
    const stranger = env.authenticatedContext("strangeruid12345678901234567890").firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), groupPath), {
        name: "Friends", description: "Shared stories", coverImage: "from-indigo-300 to-purple-200",
        createdBy: "owneruid12345678901234567890", createdAt: "2024-01-01T00:00:00.000Z",
      });
    });

    await t.test("owner reads group; outsider and anonymous users cannot", async () => {
      await assertSucceeds(getDoc(doc(owner, groupPath)));
      await assertFails(getDoc(doc(owner, "groups/never-created")));
      await assertSucceeds(getDocs(query(collection(owner, "groups"), where("createdBy", "==", "owneruid12345678901234567890"))));
      await assertFails(getDocs(query(collection(stranger, "groups"), where("createdBy", "==", "owneruid12345678901234567890"))));
      await assertSucceeds(setDoc(doc(owner, "groups/empty-description"), {
        name: "New vault", description: "", coverImage: "from-indigo-300 via-purple-200 to-amber-100",
        createdBy: "owneruid12345678901234567890", createdAt: "2024-01-01T00:00:00.000Z",
      }));
      await assertFails(setDoc(doc(stranger, "groups/forged-owner"), {
        name: "Forged", description: "", coverImage: "from-indigo-300 via-purple-200 to-amber-100",
        createdBy: "owneruid12345678901234567890", createdAt: "2024-01-01T00:00:00.000Z",
      }));
      await assertFails(getDoc(doc(stranger, groupPath)));
      await assertFails(getDoc(doc(anonymous, groupPath)));
      await assertFails(getDoc(doc(member, groupPath)));
    });

    await t.test("only the owner can invite; only the invitee can accept or reject", async () => {
      const invitation = { inviteeId: "memberuid12345678901234567890", invitedBy: "owneruid12345678901234567890", createdAt: "2024-01-02T00:00:00.000Z" };
      const acceptedMember = { userId: "memberuid12345678901234567890", groupId, role: "member", displayName: "Friend", joinedAt: "2024-01-03T00:00:00.000Z" };
      await assertFails(setDoc(doc(member, membershipPath), acceptedMember));
      await env.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), invitationPath), { ...invitation, inviteeId: "anotheruid12345678901234567890" });
      });
      await assertFails(setDoc(doc(member, membershipPath), acceptedMember));
      await env.withSecurityRulesDisabled(async (context) => {
        await deleteDoc(doc(context.firestore(), invitationPath));
      });
      await assertFails(setDoc(doc(stranger, invitationPath), { ...invitation, invitedBy: "strangeruid12345678901234567890" }));
      await assertSucceeds(setDoc(doc(owner, invitationPath), invitation));
      await assertSucceeds(getDoc(doc(member, invitationPath)));
      await assertFails(getDoc(doc(stranger, invitationPath)));
      await assertFails(setDoc(doc(member, membershipPath), { ...acceptedMember, role: "admin" }));
      await assertFails(setDoc(doc(stranger, membershipPath), acceptedMember));
      await assertFails(setDoc(doc(stranger, membershipPath), { userId: "memberuid12345678901234567890", groupId, role: "admin", displayName: "Stranger", joinedAt: "2024-01-03T00:00:00.000Z" }));
      const batch = writeBatch(member);
      batch.set(doc(member, membershipPath), acceptedMember);
      batch.delete(doc(member, invitationPath));
      await assertSucceeds(batch.commit());
      await assertSucceeds(getDoc(doc(member, groupPath)));
      await assertSucceeds(getDocs(query(collectionGroup(member, "members"), where("userId", "==", "memberuid12345678901234567890"))));
      await assertFails(getDocs(query(collectionGroup(stranger, "members"), where("userId", "==", "memberuid12345678901234567890"))));
      await assertFails(getDocs(collectionGroup(member, "members")));
      await assertFails(getDoc(doc(stranger, groupPath)));
    });

    await t.test("member reads and creates memories; outsider cannot", async () => {
      const memory = { title: "A day", description: "A story", memoryDate: "2024-01-01", location: "", imagePath: "", uploadedBy: "memberuid12345678901234567890", uploadedByName: "Friend", createdAt: "2024-01-03T00:00:00.000Z" };
      await assertSucceeds(setDoc(doc(member, memoryPath), memory));
      const photos = [{ publicId: `friendvault/groups/${groupId}/memories/test-memory/memberuid12345678901234567890/123e4567-e89b-12d3-a456-426614174000`, url: "https://res.cloudinary.com/example/image/authenticated/example.jpg", format: "jpg" }];
      await assertSucceeds(updateDoc(doc(member, memoryPath), { photos }));
      await assertSucceeds(getDoc(doc(owner, memoryPath)));
      await assertSucceeds(getDoc(doc(member, memoryPath)));
      await assertFails(updateDoc(doc(stranger, memoryPath), { photos: [] }));
      await assertFails(updateDoc(doc(member, memoryPath), { photos: Array(13).fill(photos[0]) }));
      await assertSucceeds(setDoc(doc(owner, `${groupPath}/memories/owner-memory`), {
        ...memory, uploadedBy: "owneruid12345678901234567890", uploadedByName: "Owner",
        imagePath: `${groupPath}/memories/owner-memory/image-123e4567-e89b-12d3-a456-426614174000`,
      }));
      await assertSucceeds(setDoc(doc(owner, `${groupPath}/memories/sample-0`), {
        ...memory, uploadedBy: "owneruid12345678901234567890", uploadedByName: "Owner",
        imagePath: `${groupPath}/memories/sample-0/image-sample`,
      }));
      await assertFails(setDoc(doc(owner, `${groupPath}/memories/forged-owner`), { ...memory, uploadedBy: "memberuid12345678901234567890" }));
      await assertFails(setDoc(doc(owner, `${groupPath}/memories/wrong-image`), {
        ...memory, uploadedBy: "owneruid12345678901234567890", imagePath: `${groupPath}/memories/owner-memory/image-123`,
      }));
      await assertSucceeds(getDoc(doc(owner, memoryPath)));
      await assertSucceeds(getDocs(collection(owner, `${groupPath}/memories`)));
      await assertSucceeds(getDoc(doc(member, memoryPath)));
      await assertSucceeds(getDocs(collection(member, `${groupPath}/memories`)));
      await assertFails(getDoc(doc(stranger, memoryPath)));
      await assertFails(getDocs(collection(stranger, `${groupPath}/memories`)));
      await assertFails(setDoc(doc(stranger, `${groupPath}/memories/forged`), { ...memory, uploadedBy: "strangeruid12345678901234567890" }));
      await assertFails(setDoc(doc(member, `${groupPath}/memories/forged`), { ...memory, uploadedBy: "owneruid12345678901234567890" }));
      await assertFails(setDoc(doc(member, `${groupPath}/memories/bad-date`), { ...memory, memoryDate: "not-a-date" }));
    });

    await t.test("only owner can promote members; members cannot invite until promoted", async () => {
      await assertFails(setDoc(doc(member, `${groupPath}/invitations/otheruid12345678901234567890`), { inviteeId: "otheruid12345678901234567890", invitedBy: "memberuid12345678901234567890", createdAt: "2024-01-04T00:00:00.000Z" }));
      await assertFails(updateDoc(doc(member, membershipPath), { role: "admin" }));
      await assertSucceeds(updateDoc(doc(owner, membershipPath), { role: "admin" }));
      await assertSucceeds(setDoc(doc(member, `${groupPath}/invitations/otheruid12345678901234567890`), { inviteeId: "otheruid12345678901234567890", invitedBy: "memberuid12345678901234567890", createdAt: "2024-01-04T00:00:00.000Z" }));
      await assertFails(deleteDoc(doc(stranger, membershipPath)));
      await assertSucceeds(getDocs(query(collection(owner, `${groupPath}/members`), where("role", "==", "admin"))));
    });
    await t.test("memory author and owner can edit and delete; other members cannot", async () => {
      const other = env.authenticatedContext("othermemberuid12345678901234567890").firestore();
      await env.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `${groupPath}/members/othermemberuid12345678901234567890`), {
          userId: "othermemberuid12345678901234567890", groupId, role: "member", displayName: "Other", joinedAt: "2024-01-04T00:00:00.000Z",
        });
      });
      await assertSucceeds(updateDoc(doc(member, memoryPath), { title: "Edited by author" }));
      await assertSucceeds(updateDoc(doc(owner, memoryPath), { description: "Edited by owner" }));
      await assertFails(updateDoc(doc(owner, memoryPath), { uploadedBy: "owneruid12345678901234567890" }));
      await assertFails(updateDoc(doc(member, memoryPath), { uploadedByName: "Someone else" }));
      await assertFails(updateDoc(doc(other, memoryPath), { title: "Unauthorized edit" }));
      await assertFails(updateDoc(doc(stranger, memoryPath), { title: "Unauthorized edit" }));
      await assertFails(deleteDoc(doc(other, memoryPath)));
      await assertSucceeds(deleteDoc(doc(owner, memoryPath)));
    });

    await t.test("short codes grant membership and rotation revokes the old code", async () => {
      const codeGroup = "code-group";
      const firstCode = "ABCDEFGH";
      const secondCode = "JKLMNPQR";
      const other = env.authenticatedContext("codefrienduid12345678901234567890").firestore();
      const group = doc(owner, "groups", codeGroup);
      await assertSucceeds(setDoc(group, {
        name: "Code group", description: "", coverImage: "from-indigo-300 to-purple-200",
        createdBy: "owneruid12345678901234567890", createdAt: "2024-01-01T00:00:00.000Z",
      }));
      const createCode = writeBatch(owner);
      createCode.update(group, { inviteCode: firstCode });
      createCode.set(doc(owner, "joinCodes", firstCode), { groupId: codeGroup, createdBy: "owneruid12345678901234567890" });
      await assertSucceeds(createCode.commit());
      await assertFails(getDoc(doc(anonymous, "joinCodes", firstCode)));
      await assertSucceeds(getDoc(doc(stranger, "joinCodes", firstCode)));
      await assertFails(getDoc(doc(stranger, "groups", codeGroup)));
      await assertFails(setDoc(doc(other, "groups", codeGroup, "members", "codefrienduid12345678901234567890"), {
        userId: "codefrienduid12345678901234567890", groupId: codeGroup, role: "admin", displayName: "Friend", joinedAt: "2024-01-02T00:00:00.000Z", joinCode: firstCode,
      }));
      await assertSucceeds(setDoc(doc(other, "groups", codeGroup, "members", "codefrienduid12345678901234567890"), {
        userId: "codefrienduid12345678901234567890", groupId: codeGroup, role: "member", displayName: "Friend", joinedAt: "2024-01-02T00:00:00.000Z", joinCode: firstCode,
      }));
      await assertSucceeds(getDoc(doc(other, "groups", codeGroup)));
      const rotate = writeBatch(owner);
      rotate.update(group, { inviteCode: secondCode });
      rotate.set(doc(owner, "joinCodes", secondCode), { groupId: codeGroup, createdBy: "owneruid12345678901234567890" });
      rotate.delete(doc(owner, "joinCodes", firstCode));
      await assertSucceeds(rotate.commit());
      await assertFails(setDoc(doc(stranger, "groups", codeGroup, "members", "strangeruid12345678901234567890"), {
        userId: "strangeruid12345678901234567890", groupId: codeGroup, role: "member", displayName: "Friend", joinedAt: "2024-01-02T00:00:00.000Z", joinCode: firstCode,
      }));
      await assertSucceeds(setDoc(doc(stranger, "groups", codeGroup, "members", "strangeruid12345678901234567890"), {
        userId: "strangeruid12345678901234567890", groupId: codeGroup, role: "member", displayName: "Friend", joinedAt: "2024-01-02T00:00:00.000Z", joinCode: secondCode,
      }));
      const imagePath = `groups/${codeGroup}/memories/cleanup-memory/image-test`;
      await assertSucceeds(setDoc(doc(owner, "groups", codeGroup, "memories", "cleanup-memory"), {
        title: "Cleanup test", description: "A story", memoryDate: "2024-01-01", location: "", imagePath,
        uploadedBy: "owneruid12345678901234567890", uploadedByName: "Owner", createdAt: "2024-01-03T00:00:00.000Z",
      }));
      await assertFails(setDoc(doc(owner, "vaultDeletionJobs", codeGroup), {
        ownerId: "owneruid12345678901234567890", imagePaths: [imagePath],
      }));
      await assertFails(deleteDoc(doc(stranger, "joinCodes", secondCode)));
      const children = await Promise.all(["memories", "members", "invitations"].map((name) => getDocs(collection(owner, "groups", codeGroup, name))));
      const deleteVault = writeBatch(owner);
      children.flatMap((snapshot) => snapshot.docs).forEach((item) => deleteVault.delete(item.ref));
      deleteVault.delete(doc(owner, "joinCodes", secondCode));
      deleteVault.set(doc(owner, "vaultDeletionJobs", codeGroup), {
        ownerId: "owneruid12345678901234567890", imagePaths: [imagePath],
        cloudinaryPublicIds: [`friendvault/groups/${codeGroup}/memories/cleanup-memory/owneruid12345678901234567890/123e4567-e89b-12d3-a456-426614174000`],
      });
      deleteVault.delete(group);
      await assertSucceeds(deleteVault.commit());
      await assertSucceeds(getDocs(query(collection(owner, "vaultDeletionJobs"), where("ownerId", "==", "owneruid12345678901234567890"))));
      await assertFails(getDocs(query(collection(stranger, "vaultDeletionJobs"), where("ownerId", "==", "owneruid12345678901234567890"))));
      await assertFails(deleteDoc(doc(stranger, "vaultDeletionJobs", codeGroup)));
      await assertSucceeds(deleteDoc(doc(owner, "vaultDeletionJobs", codeGroup)));
      await env.withSecurityRulesDisabled(async (context) => {
        const database = context.firestore();
        const paths = ["groups/" + codeGroup, "joinCodes/" + secondCode];
        for (const path of paths) assert.equal((await getDoc(doc(database, path))).exists(), false);
        assert.equal((await getDocs(collection(database, "groups", codeGroup, "members"))).empty, true);
      });
    });

    await t.test("deletion preflight lets the owner list only their group's children", async () => {
      for (const name of ["memories", "members", "invitations"]) {
        const path = `${groupPath}/${name}`;
        await assertSucceeds(getDocs(collection(owner, path)));
        await assertFails(getDocs(collection(stranger, path)));
      }
      const ownerMemories = await getDocs(collection(owner, `${groupPath}/memories`));
      assert.ok(ownerMemories.docs.some((item) => item.id === "test-memory"));
    });

    await t.test("only owner can edit or delete a group", async () => {
      await assertFails(updateDoc(doc(member, groupPath), { name: "Taken over" }));
      await assertSucceeds(updateDoc(doc(owner, groupPath), { name: "Friends Forever" }));
      await assertFails(deleteDoc(doc(member, groupPath)));
      await assertFails(deleteDoc(doc(stranger, groupPath)));
      const children = await Promise.all(["memories", "members", "invitations"].map((name) => getDocs(collection(owner, groupPath, name))));
      const batch = writeBatch(owner);
      children.flatMap((snapshot) => snapshot.docs).forEach((item) => batch.delete(item.ref));
      batch.delete(doc(owner, groupPath));
      await assertSucceeds(batch.commit());
    });
  } finally {
    await env.cleanup();
  }
});
