import test from "node:test";
import assert from "node:assert/strict";
import { PatchValidationError, validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const task = {
  schema_version: 1,
  allowed_paths: ["app/settings/page.tsx", "tests/settings-page.test.ts"],
};
const existing = ["app/settings/page.tsx"];

const manifest = (files, extra = {}) => ({ schema_version: 1, files, ...extra });
const file = (path, operation = "modify", content = "export const value = 1;") => ({
  path,
  operation,
  content,
});

test("accepts an explicitly authorized new file and existing-file modification", () => {
  const result = validatePatchManifest(
    manifest([
      file("app/settings/page.tsx", "modify"),
      file("tests/settings-page.test.ts", "add", "import test from 'node:test';"),
    ]),
    task,
    existing,
  );
  assert.equal(result.files.length, 2);
  assert.equal(result.safety.no_deletions_supported, true);
});

test("rejects files outside the task's exact allowlist", () => {
  assert.throws(
    () => validatePatchManifest(manifest([file("app/account/page.tsx", "add")]), task, existing),
    /not explicitly authorized/,
  );
});

test("rejects path traversal, absolute paths, protected roots, and hidden files", () => {
  for (const path of [
    "app/../secrets/token.txt",
    "/app/settings/page.tsx",
    "supabase/migrations/001.sql",
    ".github/workflows/agent.yml",
    "docs/.env.local",
    "app\\settings\\page.tsx",
  ]) {
    assert.throws(
      () => validatePatchManifest(manifest([file(path, "add")]), task, existing),
      PatchValidationError,
    );
  }
});

test("enforces add versus modify semantics against the base checkout", () => {
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx", "add")]), task, existing),
    /cannot replace an existing file/,
  );
  assert.throws(
    () => validatePatchManifest(manifest([file("tests/settings-page.test.ts", "modify")]), task, existing),
    /must target an existing file/,
  );
});

test("rejects duplicate paths and unsupported delete operations", () => {
  assert.throws(
    () => validatePatchManifest(
      manifest([
        file("app/settings/page.tsx"),
        file("app/settings/page.tsx"),
      ]),
      task,
      existing,
    ),
    /Duplicate patch path/,
  );
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx", "delete")]), task, existing),
    /Only add and modify/,
  );
});

test("rejects binary content, empty content, and unexpected fields", () => {
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx", "modify", "bad\0content")]), task, existing),
    /NUL-containing/,
  );
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx", "modify", "")]), task, existing),
    /non-empty/,
  );
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx", "modify", "ok")], { command: "npm test" }), task, existing),
    /unexpected top-level fields/,
  );
});

test("enforces per-file, total-size, file-count, and schema limits", () => {
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx", "modify", "x".repeat(65537))]), task, existing),
    /64 KiB/,
  );
  const manyFiles = Array.from({ length: 21 }, (_, i) => file(`docs/file-${i}.md`, "add", "x"));
  assert.throws(
    () => validatePatchManifest(manifest(manyFiles), { schema_version: 1, allowed_paths: manyFiles.map(x => x.path) }, existing),
    /between 1 and 20/,
  );
  assert.throws(
    () => validatePatchManifest({ schema_version: 2, files: [file("app/settings/page.tsx")] }, task, existing),
    /schema version/,
  );
});

test("requires a previously validated task and an existing-path inventory", () => {
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx")]), null, existing),
    /validated task/,
  );
  assert.throws(
    () => validatePatchManifest(manifest([file("app/settings/page.tsx")]), task, null),
    /Existing repository paths/,
  );
});
