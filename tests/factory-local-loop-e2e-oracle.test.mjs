import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const candidateUrl = new URL("./factory-local-loop-e2e.generated.test.mjs", import.meta.url);
const candidatePath = fileURLToPath(candidateUrl);
if (process.env.GCAN_FACTORY_TRUSTED_ORACLE === "1" && !existsSync(candidatePath)) {
  throw new Error("Trusted Factory Oracle candidate is required in strict acceptance mode.");
}
if (existsSync(candidatePath)) {
  const { normalizeInput } = await import(candidateUrl);
  test("trusted Factory Oracle verifies the generated normalizeInput behavior", () => {
    assert.equal(normalizeInput("  GCAN Factory  "), "gcan factory");
  });
}
