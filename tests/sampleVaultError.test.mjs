import assert from "node:assert/strict";
import test from "node:test";
import { sampleVaultStage, SampleVaultStageError } from "../src/features/groups/utils/sampleVaultError.ts";

test("sample diagnostics preserve the Firebase code and failing operation", async () => {
  const original = console.error;
  const logs = [];
  console.error = (...items) => logs.push(items);
  try {
    await assert.rejects(
      sampleVaultStage("check-existing-vault", async () => { throw Object.assign(new Error("Missing or insufficient permissions"), { code: "permission-denied" }); }),
      (error) => error instanceof SampleVaultStageError && error.stage === "check-existing-vault" && error.code === "permission-denied",
    );
    assert.equal(logs[0][1].stage, "check-existing-vault");
    assert.equal(logs[0][1].code, "permission-denied");
  } finally {
    console.error = original;
  }
});
