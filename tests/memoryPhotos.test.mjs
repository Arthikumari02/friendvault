import assert from "node:assert/strict";
import test from "node:test";
import { parseMemoryPhotos, photoBelongsToMemory, validatePhotoFile } from "../src/features/memories/utils/memoryPhotos.ts";

const publicId = "friendvault/groups/vault-1/memories/memory-1/user-1/123e4567-e89b-12d3-a456-426614174000";
const photo = { publicId, url: "https://res.cloudinary.com/example/image/authenticated/photo.jpg", format: "jpg" };

test("photo file limits reject unsupported, empty, and oversized images", () => {
  assert.equal(validatePhotoFile({ type: "image/jpeg", size: 100 }), "");
  assert.match(validatePhotoFile({ type: "text/plain", size: 100 }), /JPEG/);
  assert.match(validatePhotoFile({ type: "image/png", size: 0 }), /non-empty/);
  assert.match(validatePhotoFile({ type: "image/png", size: 11 * 1024 * 1024 }), /10 MB/);
});

test("only photos stored under the requested vault and memory are accepted", () => {
  assert.equal(photoBelongsToMemory(publicId, "vault-1", "memory-1"), true);
  assert.equal(photoBelongsToMemory(publicId, "vault-2", "memory-1"), false);
  assert.deepEqual(parseMemoryPhotos([photo], "vault-1", "memory-1"), [photo]);
  assert.deepEqual(parseMemoryPhotos([{ ...photo, publicId: "other/photo" }], "vault-1", "memory-1"), []);
  assert.deepEqual(parseMemoryPhotos([{ ...photo, url: "https://example.com/photo.jpg" }], "vault-1", "memory-1"), []);
  assert.deepEqual(parseMemoryPhotos([{ ...photo, format: "html" }], "vault-1", "memory-1"), []);
  assert.deepEqual(parseMemoryPhotos([{ publicId }], "vault-1", "memory-1"), []);
});
