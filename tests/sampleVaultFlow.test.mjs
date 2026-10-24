import assert from "node:assert/strict";
import test from "node:test";
import { isResumableSampleGroup, parseSampleVaultDraft, sampleGroup, sampleMemories, saveSampleVault } from "../src/features/groups/utils/sampleVaultFlow.ts";

test("stored sample drafts are validated before reuse", () => {
  const draft = { id: "123e4567-e89b-12d3-a456-426614174000", createdAt: "2026-10-22T00:00:00.000Z" };
  assert.deepEqual(parseSampleVaultDraft(draft), draft);
  assert.equal(parseSampleVaultDraft(null), null);
  assert.equal(parseSampleVaultDraft({ id: draft.id, createdAt: 123 }), null);
  assert.equal(parseSampleVaultDraft({ id: "not-a-draft", createdAt: draft.createdAt }), null);
});

function fakePersistence() {
  const groups = new Map();
  const memories = new Map();
  let createCount = 0;
  let failOnceAt = -1;
  return {
    groups, memories,
    get createCount() { return createCount; },
    failAt(index) { failOnceAt = index; },
    getGroup: async (id) => groups.get(id) ?? null,
    createGroup: async (draft) => {
      createCount += 1;
      groups.set(draft.id, { id: draft.id, name: "The Lake House Crew", coverImage: "/lake-vault-cover.png", createdBy: "owner", createdAt: draft.createdAt });
    },
    ensureMemory: async (groupId, memoryId, memory, photo) => {
      const index = Number(memoryId.slice("sample-".length));
      if (index === failOnceAt) { failOnceAt = -1; throw new Error("temporary upload failure"); }
      const key = `${groupId}/${memoryId}`;
      if (!memories.has(key)) memories.set(key, { title: memory.title, photo });
    },
  };
}

test("a failed sample creation resumes the same vault and memories on retry", async () => {
  const persistence = fakePersistence();
  const draft = { id: "first-vault", createdAt: "2026-10-22T00:00:00.000Z" };
  const photos = ["lake", "birthday", "road", "dinner"];
  persistence.failAt(2);
  await assert.rejects(saveSampleVault(draft, "owner", "Owner", photos, persistence), /temporary upload failure/);
  assert.equal(persistence.createCount, 1);
  assert.equal(persistence.memories.size, 2);
  assert.equal(await saveSampleVault(draft, "owner", "Owner", photos, persistence), draft.id);
  assert.equal(persistence.createCount, 1);
  assert.equal(persistence.memories.size, sampleMemories.length);
  assert.deepEqual([...persistence.memories.keys()], sampleMemories.map((_, index) => `first-vault/sample-${index}`));
});

test("a second click with a new draft creates another vault", async () => {
  const persistence = fakePersistence();
  const photos = ["lake", "birthday", "road", "dinner"];
  await saveSampleVault({ id: "first-vault", createdAt: "2026-10-22T00:00:00.000Z" }, "owner", "Owner", photos, persistence);
  await saveSampleVault({ id: "second-vault", createdAt: "2026-10-22T00:01:00.000Z" }, "owner", "Owner", photos, persistence);
  assert.equal(persistence.groups.size, 2);
  assert.equal(persistence.memories.size, sampleMemories.length * 2);
});

test("sample vault saves every text memory without a Storage bucket", async () => {
  const persistence = fakePersistence();
  const draft = { id: "spark-vault", createdAt: "2026-10-22T00:00:00.000Z" };
  const result = await saveSampleVault(draft, "owner", "Owner", sampleMemories.map(() => null), persistence);
  assert.equal(result, draft.id);
  assert.equal(persistence.memories.size, sampleMemories.length);
  assert.ok([...persistence.memories.values()].every((memory) => memory.photo === null));
});

test("sample creation refuses to overwrite another vault", async () => {
  const persistence = fakePersistence();
  persistence.groups.set("occupied", { id: "occupied", name: "Private vault", coverImage: "", createdBy: "someone-else", createdAt: "2026-10-22T00:00:00.000Z" });
  await assert.rejects(saveSampleVault({ id: "occupied", createdAt: "2026-10-22T00:00:00.000Z" }, "owner", "Owner", ["lake", "birthday", "road", "dinner"], persistence), /already in use/);
  assert.equal(persistence.createCount, 0);
  assert.equal(persistence.memories.size, 0);
});

test("only the same owner's saved sample vault can open after setup fails", () => {
  const draft = { id: "saved-vault", createdAt: "2026-10-22T00:00:00.000Z" };
  const group = { ...sampleGroup, id: draft.id, createdBy: "owner", createdAt: draft.createdAt };
  assert.equal(isResumableSampleGroup(group, draft, "owner"), true);
  assert.equal(isResumableSampleGroup({ ...group, createdBy: "another-user" }, draft, "owner"), false);
  assert.equal(isResumableSampleGroup({ ...group, id: "another-vault" }, draft, "owner"), false);
  assert.equal(isResumableSampleGroup(null, draft, "owner"), false);
});

test("sample group and memory payloads fit the local Firestore field limits", () => {
  assert.ok(sampleGroup.name.length > 0 && sampleGroup.name.length <= 100);
  assert.ok(sampleGroup.description.length <= 2000);
  assert.ok(sampleGroup.coverImage.length <= 200);
  for (const [index, memory] of sampleMemories.entries()) {
    assert.ok(memory.title.length > 0 && memory.title.length <= 150);
    assert.ok(memory.description.length > 0 && memory.description.length <= 5000);
    assert.match(memory.memoryDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(memory.location.length <= 150);
    assert.match(`groups/draft-id/memories/sample-${index}/image-sample`, /^groups\/draft-id\/memories\/sample-[0-9]+\/image-[A-Za-z0-9-]+$/);
  }
});
