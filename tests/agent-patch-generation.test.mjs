import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/generate-agent-patch.mjs", import.meta.url), "utf8");

test("patch proposal reads only task-approved files and restricts local source context", () => {
  assert.ok(source.includes("task.allowed_paths"));
  assert.ok(source.includes("MAX_FILES = 3"));
  assert.ok(source.includes("MAX_SOURCE_FILE_BYTES = 8 * 1024"));
  assert.ok(source.includes("MAX_TOTAL_SOURCE_BYTES = 12 * 1024"));
});

test("patch proposal is restricted to local Ollama and structured output", () => {
  assert.ok(source.includes("Only a loopback Ollama endpoint is permitted"));
  assert.ok(source.includes("format: patchSchema(paths)"));
  assert.ok(source.includes("think: false"));
});

test("patch output is validated against exact task paths and existing-file state", () => {
  assert.ok(source.includes("validatePatchManifest(candidate, task, existingPaths)"));
  assert.ok(source.includes("Patch path is not present in the original task allowlist."));
});

test("patch proposal blocks symlinks and sensitive source content", () => {
  assert.ok(source.includes("assertNoSymlinkSegments(path)"));
  assert.ok(source.includes("containsSensitiveMaterial(content)"));
  assert.ok(source.includes("refusing to send it to the local model"));
});

test("patch proposal is data-only and never executes or applies model output", () => {
  assert.ok(source.includes("no repository files were modified"));
  assert.ok(source.includes("Do not execute, apply, or claim to have applied any patch."));
  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
  assert.ok(source.includes("attempt < 2"));
});
