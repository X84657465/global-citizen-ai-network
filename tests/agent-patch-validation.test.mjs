import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPatchManifestFiles, PatchValidationError, scopePatchTaskToBatch, validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const task = {
  schema_version: 1,
  allowed_paths: ["app/settings/page.tsx", "tests/settings-page.test.ts"],
};
const existing = ["app/settings/page.tsx"];
const generator = readFileSync(new URL("../scripts/generate-agent-patch.mjs", import.meta.url), "utf8");

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
  assert.equal(generator.includes("Other source files may be read for context"), false);
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


test("rejects malformed model manifest roots before patch generation iterates files", () => {
  for (const malformed of [null, [], "manifest", 7, {}, { files: null }, { files: {} }, { files: "not-an-array" }]) {
    assert.throws(() => getPatchManifestFiles(malformed), /object containing a files array/);
  }
  assert.deepEqual(getPatchManifestFiles({ schema_version: 1, files: [] }), []);
});

 
test("patch generation prompt follows the repository test and UI integration contracts", () => {
  const generator = readFileSync(new URL("../scripts/generate-agent-patch.mjs", import.meta.url), "utf8");
  for (const requiredRule of [
    "node:test and node:assert/strict",
    "Do not assume Jest, Vitest, Playwright component testing, jsdom, browser globals, jest.fn",
    "Never put JSX syntax in a .ts file",
    "Do not invent component names, exports, imports, API fields, response shapes, or test fixtures",
    "If supplied source_files do not expose the existing component/API contract needed to integrate requested UI, do not guess or create a disconnected parallel component",
    "Only the supplied source_files are available as repository context",
    "New UI must be wired into the existing page, component, and data flow",
    "Derive choices and displayed values from real API fields, never fabricated categories or statuses",
    "Factual grounding is mandatory: treat the task goal, acceptance criteria, and supplied source_files as the complete evidence base",
    "Do not assert that a capability, integration, security control, data-handling practice, operational behavior, metric, or compliance property exists unless directly supported by those inputs",
    "When a capability is requested but the supplied evidence does not establish it is implemented, describe it explicitly as proposed or desired, never as current behavior",
    "If a factual claim cannot be grounded in the supplied evidence, omit it or label it as an assumption requiring verification",
    "Never invent encryption, anonymization, monitoring, approval, audit, privacy, compliance, or production guarantees",
  ]) {
    assert.ok(generator.includes(requiredRule), "Missing patch-generation policy: " + requiredRule);
  }
});


test("requires every task-declared output and rejects literal prohibited content", () => {
  const contractTask = {
    schema_version: 1,
    allowed_paths: ["docs/security/remediation.md", "tests/security/remediation.test.mjs"],
    required_patch_paths: ["tests/security/remediation.test.mjs"],
    forbidden_content: ["Recommended Next.js version: 13.5.6", "Run command: npm audit fix --force"],
  };
  assert.throws(
    () => validatePatchManifest(
      manifest([file("docs/security/remediation.md", "add", "A reproducible plan.")]),
      contractTask,
      existing,
    ),
    /missing a required output path/,
  );
  assert.throws(
    () => validatePatchManifest(
      manifest([
        file("docs/security/remediation.md", "add", "Recommended Next.js version: 13.5.6"),
        file("tests/security/remediation.test.mjs", "add", "import test from 'node:test';"),
      ]),
      contractTask,
      existing,
    ),
    /task-prohibited text/,
  );
  const accepted = validatePatchManifest(
    manifest([
      file("docs/security/remediation.md", "add", "Preserve the current supported major versions."),
      file("tests/security/remediation.test.mjs", "add", "import test from 'node:test';"),
    ]),
    contractTask,
    existing,
  );
  assert.equal(accepted.safety.required_patch_paths_enforced, true);
  assert.equal(accepted.safety.forbidden_content_enforced, true);
});


test("scopes required outputs to each single-file generation batch and preserves final aggregate enforcement", () => {
  const contractTask = {
    schema_version: 1,
    allowed_paths: ["docs/security/remediation.md", "tests/security/remediation.test.mjs"],
    required_patch_paths: ["docs/security/remediation.md", "tests/security/remediation.test.mjs"],
    forbidden_content: ["do not downgrade"],
  };
  const firstBatch = scopePatchTaskToBatch(contractTask, ["docs/security/remediation.md"]);
  const secondBatch = scopePatchTaskToBatch(contractTask, ["tests/security/remediation.test.mjs"]);
  assert.deepEqual(firstBatch.required_patch_paths, ["docs/security/remediation.md"]);
  assert.deepEqual(secondBatch.required_patch_paths, ["tests/security/remediation.test.mjs"]);
  assert.deepEqual(firstBatch.allowed_paths, ["docs/security/remediation.md"]);
  assert.deepEqual(firstBatch.forbidden_content, contractTask.forbidden_content);
  assert.throws(
    () => validatePatchManifest(
      manifest([file("docs/security/remediation.md", "add", "A safe remediation plan.")]),
      contractTask,
      existing,
    ),
    /missing a required output path/,
  );
  assert.doesNotThrow(() => validatePatchManifest(
    manifest([
      file("docs/security/remediation.md", "add", "A safe remediation plan."),
      file("tests/security/remediation.test.mjs", "add", "import test from 'node:test';"),
    ]),
    contractTask,
    existing,
  ));
});
