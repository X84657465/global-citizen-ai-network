import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const candidateUrl = new URL("./factory-local-loop-e2e.generated.test.mjs", import.meta.url);
if (existsSync(fileURLToPath(candidateUrl))) {
  const { normalizeInput } = await import(candidateUrl);
  test("trusted Factory Oracle verifies the generated normalizeInput behavior", () => {
    assert.equal(normalizeInput("  GCAN Factory  "), "gcan factory");
  });
}
