import assert from "node:assert/strict";
import test from "node:test";
import { resolveGroupSections } from "../src/features/groups/utils/resolveGroupSections.ts";

const group = {
  id: "firestore-document-id",
  name: "Friends",
  description: "Shared stories",
  createdBy: "owner-uid",
  createdAt: "2024-01-01T00:00:00.000Z",
};
const denied = { status: "rejected", reason: { code: "permission-denied" } };
const members = { status: "fulfilled", value: [{ groupId: group.id, userId: "owner-uid", role: "owner", displayName: "Owner", joinedAt: group.createdAt }] };
const memories = { status: "fulfilled", value: [{ id: "memory-id" }] };

test("verified owner can see group overview when old rules deny subcollections", () => {
  assert.deepEqual(resolveGroupSections(group, "owner-uid", denied, denied), {
    members: [{ groupId: group.id, userId: "owner-uid", role: "owner", displayName: "Group owner", joinedAt: group.createdAt }],
    memories: [], membersUnavailable: true, memoriesUnavailable: true,
  });
});

test("available sections remain visible when only one owner read is denied", () => {
  const result = resolveGroupSections(group, "owner-uid", members, denied);
  assert.deepEqual(result.members, members.value);
  assert.equal(result.memoriesUnavailable, true);
  assert.equal(result.membersUnavailable, false);
});

test("signed-in nonowners never get the owner fallback", () => {
  assert.throws(() => resolveGroupSections(group, "stranger-uid", denied, memories), (error) => error.code === "permission-denied");
  assert.throws(() => resolveGroupSections(group, "", denied, memories), (error) => error.code === "permission-denied");
});

test("network failures remain errors even for the owner", () => {
  assert.throws(() => resolveGroupSections(group, "owner-uid", { status: "rejected", reason: new Error("offline") }, memories), /offline/);
});
