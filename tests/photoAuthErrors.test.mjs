import assert from "node:assert/strict";
import test from "node:test";
import { photoAuthFailure } from "../src/server/photoAuthErrors.ts";

test("photo auth distinguishes expired and invalid ID tokens", () => {
  assert.deepEqual(photoAuthFailure({ code: "auth/id-token-expired" }), {
    status: 401, message: "Your sign-in token expired. Refresh your sign-in and retry.", reason: "auth/id-token-expired",
  });
  assert.match(photoAuthFailure({ code: "auth/invalid-id-token" }).message, /Invalid sign-in token/);
  assert.equal(photoAuthFailure({ code: "auth/id-token-revoked" }).status, 401);
});

test("missing or unusable Admin credentials are server errors", () => {
  const missing = photoAuthFailure(new Error("Could not load the default credentials."));
  assert.equal(missing.status, 503);
  assert.equal(missing.reason, "admin-credentials-unavailable");
  assert.equal(photoAuthFailure({ code: "auth/insufficient-permission" }).status, 503);
  assert.equal(photoAuthFailure({ code: "auth/invalid-credential" }).status, 503);
});

test("unknown verification failures do not claim the user expired", () => {
  const failure = photoAuthFailure(new Error("Network unavailable"));
  assert.equal(failure.status, 503);
  assert.doesNotMatch(failure.message, /expired/);
});
