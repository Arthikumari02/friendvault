import fs from "node:fs";
import test from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { deleteObject, getMetadata, ref, uploadBytes } from "firebase/storage";

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

test("Storage memory images are restricted to group owners and members", {
  skip: (!firestoreHost || !storageHost) && "Start the Firestore and Storage emulators",
}, async (t) => {
  const [firestoreAddress, firestorePort] = firestoreHost.split(":");
  const [storageAddress, storagePort] = storageHost.split(":");
  const projectId = process.env.GCLOUD_PROJECT || "demo-friendvault-rules";
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host: firestoreAddress, port: Number(firestorePort), rules: fs.readFileSync("firestore.rules", "utf8") },
    storage: { host: storageAddress, port: Number(storagePort), rules: fs.readFileSync("storage.rules", "utf8") },
  });
  try {
    const groupId = "photo-group";
    const ownerId = "owneruid12345678901234567890";
    const memberId = "memberuid12345678901234567890";
    const strangerId = "strangeruid12345678901234567890";
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "groups", groupId), {
        name: "Photo group", description: "", coverImage: "from-indigo-300 via-purple-200 to-amber-100",
        createdBy: ownerId, createdAt: "2024-01-01T00:00:00.000Z",
      });
      await setDoc(doc(context.firestore(), "groups", groupId, "members", memberId), {
        userId: memberId, groupId, role: "member", displayName: "Friend", joinedAt: "2024-01-02T00:00:00.000Z",
      });
    });
    const bucket = `gs://${projectId}.appspot.com`;
    const owner = env.authenticatedContext(ownerId).storage(bucket);
    const member = env.authenticatedContext(memberId).storage(bucket);
    const stranger = env.authenticatedContext(strangerId).storage(bucket);
    const path = `groups/${groupId}/memories/memory-id/image-123e4567-e89b-12d3-a456-426614174000`;
    const ownerImage = ref(owner, path);
    const memberImage = ref(member, path);
    const strangerImage = ref(stranger, path);
    const metadata = { contentType: "image/png", customMetadata: { groupOwner: ownerId, uploadedBy: memberId, memoryAuthor: memberId } };

    await t.test("outsider and wrong content type cannot upload", async () => {
      await assertFails(uploadBytes(strangerImage, new Uint8Array([1, 2, 3]), { ...metadata, customMetadata: { ...metadata.customMetadata, uploadedBy: strangerId } }));
      await assertFails(uploadBytes(memberImage, new Uint8Array([1, 2, 3]), { ...metadata, contentType: "text/plain" }));
    });
    await t.test("member uploads a valid image", async () => {
      await assertSucceeds(uploadBytes(memberImage, new Uint8Array([1, 2, 3]), metadata));
    });
    await t.test("owner can upload a sample image and outsiders cannot read it", async () => {
      const samplePath = `groups/${groupId}/memories/sample-0/image-sample`;
      const sampleMetadata = { contentType: "image/jpeg", customMetadata: { groupOwner: ownerId, uploadedBy: ownerId, memoryAuthor: ownerId } };
      await assertSucceeds(uploadBytes(ref(owner, samplePath), new Uint8Array([1, 2, 3]), sampleMetadata));
      await assertSucceeds(getMetadata(ref(owner, samplePath)));
      await assertFails(getMetadata(ref(stranger, samplePath)));
    });
    await t.test("owner and member can read, outsider cannot", async () => {
      await assertSucceeds(getMetadata(ownerImage));
      await assertSucceeds(getMetadata(memberImage));
      await assertFails(getMetadata(strangerImage));
    });
    await t.test("only an authorized account can remove the image", async () => {
      await assertFails(deleteObject(strangerImage));
      await assertSucceeds(deleteObject(ownerImage));
    });
    await t.test("the owner can retry photo cleanup after the group document is gone", async () => {
      const samplePath = `groups/${groupId}/memories/sample-0/image-sample`;
      await assertSucceeds(deleteDoc(doc(env.authenticatedContext(ownerId).firestore(), "groups", groupId)));
      await assertFails(deleteObject(ref(stranger, samplePath)));
      await assertSucceeds(deleteObject(ref(owner, samplePath)));
    });
  } finally {
    await env.cleanup();
  }
});
