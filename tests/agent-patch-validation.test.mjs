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
    /Existing test files are immutable/,
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


test("existing test files cannot be modified and control-plane files require explicit approval", () => {
  assert.throws(
    () => validatePatchManifest(
      manifest([file("tests/settings-page.test.ts", "modify")]),
      task,
      existing.concat("tests/settings-page.test.ts"),
    ),
    /Existing test files are immutable/,
  );

  const protectedTask = {
    schema_version: 1,
    allowed_paths: ["lib/agent-factory-state-machine.mjs"],
    control_plane_authorized: false,
  };
  const protectedPatch = manifest([file("lib/agent-factory-state-machine.mjs", "modify")]);
  assert.throws(
    () => validatePatchManifest(protectedPatch, protectedTask, ["lib/agent-factory-state-machine.mjs"]),
    /factory-control-plane-approved/,
  );

  const approvedTask = { ...protectedTask, control_plane_authorized: true };
  const approved = validatePatchManifest(
    protectedPatch,
    approvedTask,
    ["lib/agent-factory-state-machine.mjs"],
  );
  assert.equal(approved.files.length, 1);
  assert.equal(approved.safety.control_plane_paths_require_approval_label, true);
});


test("accepts the exact scheduler workflow path only with control-plane approval and as an existing file", () => {
  const workflowPath = ".github/workflows/agent-task-preflight.yml";
  const approvedTask = {
    schema_version: 1,
    allowed_paths: [workflowPath],
    control_plane_authorized: true,
  };
  const result = validatePatchManifest(
    manifest([file(workflowPath, "modify", "name: AI Agent Task Preflight\\n")]),
    approvedTask,
    [workflowPath],
  );
  assert.equal(result.files[0].path, workflowPath);
  assert.equal(result.safety.control_plane_paths_require_approval_label, true);

  assert.throws(
    () => validatePatchManifest(
      manifest([file(workflowPath, "modify")]),
      { ...approvedTask, control_plane_authorized: false },
      [workflowPath],
    ),
    /factory-control-plane-approved/,
  );
  assert.throws(
    () => validatePatchManifest(
      manifest([file(workflowPath, "add")]),
      approvedTask,
      [workflowPath],
    ),
    /cannot replace an existing file/,
  );
});

test("rejects non-exact GitHub workflow paths and traversal at patch validation", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/build.yml",
    ".github/workflows/agent-task-preflight.yaml",
    ".GITHUB/workflows/agent-task-preflight.yml",
    ".github/CODEOWNERS",
    ".github/workflows/../agent-task-preflight.yml",
    ".github/workflows/agent-task-preflight.yml/../../secrets/token.txt",
    ".github/workflows/agent-task-preflight.yml/credentials.txt",
    ".github/workflows/.env",
  ]) {
    assert.throws(
      () => validatePatchManifest(
        manifest([file(path, "modify")]),
        { schema_version: 1, allowed_paths: [path], control_plane_authorized: true },
        [path],
      ),
      PatchValidationError,
      path,
    );
  }
});


test("accepts the exact scheduler workflow path only with control-plane approval and as an existing file", () => {
  const workflowPath = ".github/workflows/agent-task-preflight.yml";
  const approvedTask = {
    schema_version: 1,
    allowed_paths: [workflowPath],
    control_plane_authorized: true,
  };
  const result = validatePatchManifest(
    manifest([file(workflowPath, "modify", "name: AI Agent Task Preflight\\n")]),
    approvedTask,
    [workflowPath],
  );
  assert.equal(result.files[0].path, workflowPath);
  assert.equal(result.safety.control_plane_paths_require_approval_label, true);

  assert.throws(
    () => validatePatchManifest(
      manifest([file(workflowPath, "modify")]),
      { ...approvedTask, control_plane_authorized: false },
      [workflowPath],
    ),
    /factory-control-plane-approved/,
  );
  assert.throws(
    () => validatePatchManifest(
      manifest([file(workflowPath, "add")]),
      approvedTask,
      [workflowPath],
    ),
    /cannot replace an existing file/,
  );
});

test("rejects non-exact GitHub workflow paths and traversal at patch validation", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/build.yml",
    ".github/workflows/agent-task-preflight.yaml",
    ".GITHUB/workflows/agent-task-preflight.yml",
    ".github/CODEOWNERS",
    ".github/workflows/../agent-task-preflight.yml",
    ".github/workflows/agent-task-preflight.yml/../../secrets/token.txt",
    ".github/workflows/agent-task-preflight.yml/credentials.txt",
    ".github/workflows/.env",
  ]) {
    assert.throws(
      () => validatePatchManifest(
        manifest([file(path, "modify")]),
        { schema_version: 1, allowed_paths: [path], control_plane_authorized: true },
        [path],
      ),
      PatchValidationError,
      path,
    );
  }
});
