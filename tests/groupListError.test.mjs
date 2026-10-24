import assert from "node:assert/strict";
import test from "node:test";
import { FirebaseError } from "firebase/app";
import { groupListErrorCode, groupListErrorMessage, groupListStep, isJoinedMembershipIndexError } from "../src/features/groups/utils/groupListError.ts";

test("My Vaults reports the failing operation without logging account data", async () => {
  const logs = [];
  const originalInfo = console.info;
  console.info = (...args) => logs.push(args);
  try {
    await assert.rejects(
      groupListStep("list-joined-memberships", async () => {
        throw new FirebaseError("failed-precondition", "The query requires an index.");
      }),
      (error) => {
        assert.equal(groupListErrorCode(error), "failed-precondition");
        assert.match(groupListErrorMessage(error), /members\.userId collection-group index/);
        assert.equal(isJoinedMembershipIndexError(error), true);
        return true;
      },
    );
    assert.deepEqual(logs, [["[FriendVault] My Vaults load", { stage: "list-joined-memberships", errorCode: "failed-precondition" }]]);
  } finally {
    console.info = originalInfo;
  }
});

test("only a missing joined-membership index can use the owned-vault fallback", async () => {
  const originalInfo = console.info;
  console.info = () => {};
  try {
    for (const [stage, code, message, expected] of [
      ["list-joined-memberships", "failed-precondition", "The query requires an index.", true],
      ["list-joined-memberships", "failed-precondition", "Database is not ready.", false],
      ["list-owned-groups", "failed-precondition", "The query requires an index.", false],
      ["list-joined-memberships", "unavailable", "Network error.", false],
    ]) {
      await assert.rejects(groupListStep(stage, async () => { throw new FirebaseError(code, message); }), (error) => {
        assert.equal(isJoinedMembershipIndexError(error), expected);
        return true;
      });
    }
  } finally {
    console.info = originalInfo;
  }
});

test("My Vaults distinguishes access, network, and index failures", async () => {
  for (const [code, expected] of [
    ["permission-denied", /denied the list group memories request/],
    ["unavailable", /Could not reach Firestore during list group memories/],
    ["failed-precondition", /failed precondition/],
  ]) {
    const originalInfo = console.info;
    console.info = () => {};
    try {
      await assert.rejects(
        groupListStep("list-group-memories", async () => { throw new FirebaseError(code, "details"); }),
        (error) => {
          assert.match(groupListErrorMessage(error), expected);
          return true;
        },
      );
    } finally {
      console.info = originalInfo;
    }
  }
});
