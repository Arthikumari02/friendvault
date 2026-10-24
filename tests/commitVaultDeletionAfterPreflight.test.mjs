import assert from "node:assert/strict";
import test from "node:test";
import { commitVaultDeletionAfterPreflight } from "../src/features/groups/utils/commitVaultDeletionAfterPreflight.ts";

test("a denied preflight read prevents the delete commit", async () => {
  let commits = 0;
  const denied = new Error("permission-denied");
  await assert.rejects(
    commitVaultDeletionAfterPreflight(
      async () => { throw denied; },
      async () => { commits += 1; },
    ),
    (error) => error === denied,
  );
  assert.equal(commits, 0);
});

test("the delete commit receives the completed preflight plan once", async () => {
  const plan = { memories: ["memory-1"], members: ["member-1"], invitations: [] };
  const committed = [];
  const result = await commitVaultDeletionAfterPreflight(
    async () => plan,
    async (ready) => { committed.push(ready); },
  );
  assert.equal(result, plan);
  assert.deepEqual(committed, [plan]);
});
