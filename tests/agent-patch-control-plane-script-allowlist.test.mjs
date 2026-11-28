import test from "node:test";
import assert from "node:assert/strict";
import { PatchValidationError, validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const registeredScripts = [
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
  files: [{ path, operation, content: "export const validationFixture = true;\\n" }],
});
const approvedTask = (allowedPaths, overrides = {}) => ({
  schema_version: 1,
  allowed_paths: allowedPaths,
  control_plane_authorized: true,
  ...overrides,
});

test("accepts only exact registered existing control-plane scripts with explicit approval", () => {
  for (const path of registeredScripts) {
    const result = validatePatchManifest(
      manifest(path),
      approvedTask([path]),
      [path],
    );
    assert.equal(result.files.length, 1, path);
    assert.equal(result.files[0].path, path);
    assert.equal(result.files[0].operation, "modify");
    assert.equal(result.safety.control_plane_paths_require_approval_label, true);
  }
});

test("rejects a registered script when control-plane approval is absent", () => {
  const path = registeredScripts[0];
  assert.throws(
    () => validatePatchManifest(
      manifest(path),
      approvedTask([path], { control_plane_authorized: false }),
      [path],
    ),
    /factory-control-plane-approved/,
  );
});

test("rejects unregistered scripts and script paths outside the exact task allowlist", () => {
  const unregistered = "scripts/unregistered-controller.mjs";
  assert.throws(
    () => validatePatchManifest(
      manifest(unregistered),
      approvedTask([unregistered]),
      [unregistered],
    ),
    PatchValidationError,
  );

  const path = registeredScripts[0];
  assert.throws(
    () => validatePatchManifest(
      manifest(path),
      approvedTask([path.toUpperCase()]),
      [path],
    ),
    /exactly match the task allowlist/,
  );
});

test("rejects case variants in the patch manifest and repository path inventory", () => {
  const path = registeredScripts[0];
  const upperPath = "scripts/Agent-factory-v2-controller.mjs";
  assert.throws(
    () => validatePatchManifest(
      manifest(upperPath),
      approvedTask([upperPath]),
      [upperPath],
    ),
    /root is outside the allowed roots/,
  );
  assert.throws(
    () => validatePatchManifest(
      manifest(path),
      approvedTask([path]),
      [upperPath],
    ),
    /exact existing repository path/,
  );
});

test("rejects add operations and missing tracked script paths", () => {
  const path = registeredScripts[0];
  assert.throws(
    () => validatePatchManifest(
      manifest(path, "add"),
      approvedTask([path]),
      [path],
    ),
    /may only be modified/,
  );
  assert.throws(
    () => validatePatchManifest(
      manifest(path),
      approvedTask([path]),
      [],
    ),
    /exact existing repository path/,
  );
});
