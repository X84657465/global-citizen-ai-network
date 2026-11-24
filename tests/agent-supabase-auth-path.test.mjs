import test from "node:test";
import assert from "node:assert/strict";
import { TaskValidationError, validateAndBuildTask } from "../lib/agent-task-validation.mjs";
import { PatchValidationError, validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const repository = "X84657465/global-citizen-ai-network";
const authPath = "lib/supabase/authenticated.ts";
const authLabel = "factory-supabase-auth-path-approved";
const issue = (path = authPath, labels = []) => ({
  number: 86,
  title: "[AI Task] Build end-to-end authentication and account security verification",
  html_url: "https://github.com/X84657465/global-citizen-ai-network/issues/86",
  state: "open",
  user: { login: "X84657465" },
  labels,
  body: `## Goal
Implement the explicitly scoped authenticated-client security behavior without broadening Supabase write access.

## Allowed paths
- ${path}

## Acceptance criteria
- The exact approved path is accepted only with dedicated owner approval
- All other Supabase paths remain blocked

## Explicit exclusions
- No other Supabase files
- No production deployment
`,
});
const manifest = (path) => ({
  schema_version: 1,
  files: [{ path, operation: "modify", content: "export const authenticatedClient = null;\n" }],
});

test("authenticated Supabase module remains blocked without its dedicated approval label", () => {
  assert.throws(() => validateAndBuildTask(issue(), repository), /prohibited segment/);
});

test("only the exact authenticated module is allowed with owner-authored dedicated approval", () => {
  const task = validateAndBuildTask(issue(authPath, [{ name: authLabel }]), repository);
  assert.deepEqual(task.allowed_paths, [authPath]);
  assert.equal(task.supabase_auth_path_authorized, true);
});

test("the dedicated label does not authorize sibling, nested, or case-variant Supabase paths", () => {
  for (const path of [
    "lib/supabase/admin.ts",
    "lib/supabase/secrets.ts",
    "lib/Supabase/authenticated.ts",
    "lib/supabase/authenticated.ts/extra.ts",
  ]) {
    assert.throws(() => validateAndBuildTask(issue(path, [{ name: authLabel }]), repository), TaskValidationError, path);
  }
});

test("the dedicated label cannot be supplied by a planner-authored task", () => {
  const plannerIssue = {
    ...issue(authPath, [{ name: authLabel }]),
    user: { login: "github-actions[bot]" },
    body: "<!-- ai-task-generated-by-planner -->\n" + issue().body,
  };
  assert.throws(() => validateAndBuildTask(plannerIssue, repository), /prohibited segment/);
});

test("patch validation accepts only the exact path when the validated task carries owner approval", () => {
  const task = validateAndBuildTask(issue(authPath, [{ name: authLabel }]), repository);
  const accepted = validatePatchManifest(manifest(authPath), task, [authPath]);
  assert.equal(accepted.files[0].path, authPath);
});

test("patch validation remains fail-closed without approval and for every other Supabase path", () => {
  const unauthorized = { schema_version: 1, allowed_paths: [authPath], supabase_auth_path_authorized: false };
  assert.throws(() => validatePatchManifest(manifest(authPath), unauthorized, [authPath]), PatchValidationError);
  const authorizedTask = {
    schema_version: 1,
    allowed_paths: ["lib/supabase/admin.ts"],
    supabase_auth_path_authorized: true,
  };
  assert.throws(
    () => validatePatchManifest(manifest("lib/supabase/admin.ts"), authorizedTask, ["lib/supabase/admin.ts"]),
    PatchValidationError,
  );
});
