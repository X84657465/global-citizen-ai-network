import test from "node:test";
import assert from "node:assert/strict";
import { PatchValidationError, validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const REGISTERED_SCRIPTS = [
  "scripts/agent-factory-v2-controller.mjs",
  "scripts/agent-factory-controller.mjs",
  "scripts/select-agent-task.mjs",
  "scripts/prepare-agent-task.mjs",
  "scripts/generate-agent-plan.mjs",
  "scripts/generate-agent-patch.mjs",
  "scripts/apply-agent-patch-to-scratch.mjs",
  "scripts/publish-agent-patch.mjs",
  "scripts/resolve-agent-task-pr.mjs",
];

const manifest = (path, operation = "modify") => ({
  schema_version: 1,
  files: [{ path, operation, content: "export const patchValidationRegression = true;\n" }],
});
const approvedTask = (path) => ({
  schema_version: 1,
  allowed_paths: [path],
  control_plane_authorized: true,
});

test("all nine exact registered control-plane scripts accept approved existing-file modifications", () => {
  for (const path of REGISTERED_SCRIPTS) {
    const result = validatePatchManifest(manifest(path), approvedTask(path), [path]);
    assert.equal(result.files.length, 1, path);
    assert.equal(result.files[0].path, path, path);
    assert.equal(result.files[0].operation, "modify", path);
  }
});

test("registered control-plane scripts fail closed without control-plane approval", () => {
  for (const path of REGISTERED_SCRIPTS) {
    assert.throws(
      () => validatePatchManifest(
        manifest(path),
        { ...approvedTask(path), control_plane_authorized: false },
        [path],
      ),
      PatchValidationError,
      path,
    );
  }
});

test("registered control-plane scripts require exact task allowlist membership", () => {
  for (const path of REGISTERED_SCRIPTS) {
    assert.throws(
      () => validatePatchManifest(manifest(path), approvedTask(path.toUpperCase()), [path]),
      /exact task allowlist membership/,
      path,
    );
  }
});

test("registered control-plane scripts require an exact existing tracked path", () => {
  for (const path of REGISTERED_SCRIPTS) {
    assert.throws(
      () => validatePatchManifest(manifest(path), approvedTask(path), []),
      /must target an existing file/,
      path,
    );
    assert.throws(
      () => validatePatchManifest(manifest(path), approvedTask(path), [path.toUpperCase()]),
      /must target an existing file/,
      path,
    );
  }
});

test("registered control-plane scripts are modify-only", () => {
  for (const path of REGISTERED_SCRIPTS) {
    assert.throws(
      () => validatePatchManifest(manifest(path, "add"), approvedTask(path), [path]),
      /approved modify-only authorization/,
      path,
    );
  }
});

test("unregistered, case-variant, and traversal script paths remain rejected", () => {
  const invalidPaths = [
    "scripts/unregistered-control-plane.mjs",
    "scripts/AGENT-FACTORY-CONTROLLER.mjs",
    "scripts/../lib/agent-write-policy.mjs",
  ];
  for (const path of invalidPaths) {
    assert.throws(
      () => validatePatchManifest(manifest(path), approvedTask(path), [path]),
      PatchValidationError,
      path,
    );
  }
});
