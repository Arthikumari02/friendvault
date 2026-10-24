import assert from "node:assert/strict";
import test from "node:test";
import { validateMemory, validateMemoryFields } from "../src/features/memories/utils/validateMemory.ts";

const valid = { title: "A trip", description: "A day to remember", memoryDate: "2024-05-10", location: "Goa", image: null };

test("accepts a complete memory without an image", () => {
  assert.equal(validateMemory(valid), "");
});

test("rejects empty stories, invalid dates, and future dates", () => {
  assert.equal(validateMemory({ ...valid, description: "  " }), "Description is required.");
  assert.match(validateMemory({ ...valid, memoryDate: "2024-99-99" }), /valid date/);
  assert.match(validateMemory({ ...valid, memoryDate: "2999-01-01" }), /valid date/);
});

test("rejects unsupported or oversized images", () => {
  assert.match(validateMemory({ ...valid, image: { type: "text/plain", size: 100 } }), /JPEG/);
  assert.match(validateMemory({ ...valid, image: { type: "image/png", size: 11 * 1024 * 1024 } }), /10 MB/);
});

test("reports each invalid field beside the memory form input", () => {
  assert.deepEqual(validateMemoryFields({ ...valid, title: " ", description: " ", memoryDate: "2999-01-01", image: { type: "text/plain", size: 100 } }), {
    title: "Title is required.",
    description: "Description is required.",
    memoryDate: "Choose a valid date that is not in the future.",
    image: "Choose a JPEG, PNG, WebP, or GIF image.",
  });
});
