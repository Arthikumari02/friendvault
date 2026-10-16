import assert from "node:assert/strict";
import test from "node:test";
import { validateGroup } from "../src/features/groups/validateGroup.ts";

test("accepts trimmed names at the limit and descriptions at the limit", () => {
  assert.deepEqual(validateGroup(`  ${"a".repeat(100)}  `, "d".repeat(2000)), {
    nameError: "",
    descriptionError: "",
  });
});

test("rejects an empty name after trimming", () => {
  assert.equal(validateGroup(" \n ", "").nameError, "Group name is required.");
});

test("reports both fields when their trimmed values exceed the limits", () => {
  assert.deepEqual(validateGroup("a".repeat(101), "d".repeat(2001)), {
    nameError: "Group name must be 100 characters or fewer.",
    descriptionError: "Description must be 2,000 characters or fewer.",
  });
});

test("checks the description length after trimming, matching the saved value", () => {
  assert.equal(validateGroup("Friends", `  ${"d".repeat(2000)}  `).descriptionError, "");
});

test("counts Unicode characters rather than UTF-16 code units", () => {
  assert.deepEqual(validateGroup("😀".repeat(100), "😀".repeat(2000)), {
    nameError: "",
    descriptionError: "",
  });
  assert.equal(validateGroup("😀".repeat(101), "").nameError,
    "Group name must be 100 characters or fewer.");
});
