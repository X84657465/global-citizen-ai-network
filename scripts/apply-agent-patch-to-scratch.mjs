import {
  appendFileSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";
import { buildScratchPatchEvidence } from "../lib/agent-scratch-evidence.mjs";
import { validatePatchManifest } from "../lib/agent-patch-validation.mjs";

let scratchDir;

const fail = (message, { taskScoped = false } = {}) => {
  let taskScopeRecorded = false;
  if (taskScoped && typeof process.env.GITHUB_ENV === "string" && process.env.GITHUB_ENV.length > 0) {
    try {
      appendFileSync(process.env.GITHUB_ENV, "AGENT_FACTORY_FAILURE_SCOPE=task\n", "utf8");
      taskScopeRecorded = true;
    } catch {
      // A marker-write failure must remain system-scoped.
    }
  }
  if (scratchDir && existsSync(scratchDir)) {
    try {
      rmSync(scratchDir, { recursive: true, force: true });
    } catch {
      // Preserve the primary validation error.
    }
  }
  console.error("Scratch patch validation failed: " + message);
  if (taskScoped && !taskScopeRecorded) {
    console.error("Task failure marker unavailable; failure remains system-scoped.");
  }
  process.exit(1);
};

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(label + " is missing or invalid JSON.");
  }
};

const task = readJson("artifacts/agent-task.json", "Validated task bundle");
const planArtifact = readJson("artifacts/agent-plan.json", "Validated plan");
let patchCandidate;
try {
  patchCandidate = JSON.parse(readFileSync("artifacts/agent-patch.json", "utf8"));
} catch (error) {
  if (error instanceof SyntaxError) {
    fail("Validated patch proposal contains invalid JSON.", { taskScoped: true });
  }
  fail("Validated patch proposal is missing or unreadable.");
}

if (task?.mode !== "preflight_only" || task?.ai_execution_enabled !== false ||
    (task.issue && task.safety?.issue_content_is_untrusted_data !== true)) {
  fail("Only a validated, AI-disabled task bundle is accepted.");
}
if (planArtifact?.execution_mode !== "validated_plan_only" ||
    planArtifact?.ai_execution_enabled !== false ||
    planArtifact?.safety?.no_commands_or_model_code_executed !== true) {
  fail("Only a validated read-only plan is accepted.");
}

let validatedPlan;
try {
  validatedPlan = validateAgentPlan(
    { schema_version: planArtifact.schema_version, tasks: planArtifact.tasks },
    task,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "Plan revalidation failed.", { taskScoped: true });
}

const plannedPaths = new Set(
  validatedPlan.tasks
    .filter((item) => item.role === "implementer" && item.action === "propose_patch")
    .flatMap((item) => item.allowed_paths.map((path) => String(path).toLowerCase())),
);
const patchablePaths = task.allowed_paths.filter((path) => plannedPaths.has(path.toLowerCase()));
if (patchablePaths.length === 0) {
  fail("The validated plan did not authorize any patch paths.", { taskScoped: true });
}

const scopedTask = { ...task, allowed_paths: patchablePaths };
let trackedPaths;
try {
  trackedPaths = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  }).split("\0").filter(Boolean);
} catch {
  fail("Unable to inventory tracked repository files.");
}

let validatedPatch;
try {
  validatedPatch = validatePatchManifest(
    { schema_version: patchCandidate.schema_version, files: patchCandidate.files },
    scopedTask,
    trackedPaths,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "Patch manifest revalidation failed.", { taskScoped: true });
}

const root = realpathSync(process.cwd());
const excludedSegments = new Set([".git", "node_modules", ".next", ".vercel", "artifacts"]);
const maxFileBytes = 50 * 1024 * 1024;
const maxTotalBytes = 300 * 1024 * 1024;
let totalBytes = 0;
let copiedFiles = 0;

let tempRoot;
try {
  tempRoot = realpathSync(process.env.RUNNER_TEMP || tmpdir());
  scratchDir = mkdtempSync(join(tempRoot, "gcan-agent-scratch-"));
} catch {
  fail("Unable to create a disposable scratch directory.");
}
const scratchRoot = realpathSync(scratchDir);

for (const relativePath of trackedPaths) {
  if (typeof relativePath !== "string" || relativePath.includes("\\") ||
      relativePath.startsWith("/") || relativePath.split("/").some((part) => !part || part === "." || part === "..")) {
    fail("Repository inventory contains an unsafe path.");
  }

  const segments = relativePath.split("/");
  if (segments.some((part) => {
    const lower = part.toLowerCase();
    return excludedSegments.has(lower) || lower.startsWith(".env") ||
      lower.includes("secret") || lower.includes("credential");
  })) {
    continue;
  }

  const sourcePath = resolve(root, relativePath);
  if (sourcePath !== root && !sourcePath.startsWith(root + sep)) {
    fail("A tracked repository path resolves outside the checkout.");
  }

  let sourceStat;
  try {
    sourceStat = lstatSync(sourcePath);
  } catch {
    fail("A tracked repository file is missing from the checkout.");
  }
  if (sourceStat.isSymbolicLink()) fail("Tracked symbolic links are not copied into the scratch workspace.");
  if (!sourceStat.isFile()) continue;
  if (sourceStat.size > maxFileBytes) fail("A tracked file exceeds the 50 MiB scratch-copy limit.");

  const realSource = realpathSync(sourcePath);
  if (realSource !== root && !realSource.startsWith(root + sep)) {
    fail("A tracked file resolves outside the checkout.");
  }

  totalBytes += sourceStat.size;
  if (totalBytes > maxTotalBytes) fail("Repository scratch copy exceeds the 300 MiB limit.");

  const destinationPath = resolve(scratchRoot, relativePath);
  if (destinationPath !== scratchRoot && !destinationPath.startsWith(scratchRoot + sep)) {
    fail("A scratch destination resolves outside the disposable workspace.");
  }
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
  copiedFiles += 1;
}

for (const file of validatedPatch.files) {
  const destinationPath = resolve(scratchRoot, file.path);
  if (destinationPath !== scratchRoot && !destinationPath.startsWith(scratchRoot + sep)) {
    fail("A patch destination resolves outside the disposable workspace.");
  }
  mkdirSync(dirname(destinationPath), { recursive: true });
  const exists = existsSync(destinationPath);
  if (file.operation === "add" && exists) fail("An add patch unexpectedly targets an existing scratch file.");
  if (file.operation === "modify" && !exists) fail("A modify patch target is missing from the scratch copy.");
  writeFileSync(destinationPath, file.content, "utf8");
}

let baseCommit = "unknown";
try {
  baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  fail("Unable to record the base commit for the scratch workspace.");
}

try {
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/agent-scratch.json",
    JSON.stringify({
      schema_version: 2,
      scratch_dir: scratchDir,
      base_commit: baseCommit,
      copied_file_count: copiedFiles,
      copied_bytes: totalBytes,
      patched_files: buildScratchPatchEvidence(validatedPatch.files),
      repository_files_modified: false,
      generated_code_executed: false,
    }, null, 2) + "\n",
    "utf8",
  );
} catch {
  fail("Unable to write the scratch workspace manifest.");
}

console.log("Validated patch applied only to a disposable scratch copy.");
console.log("Copied tracked files: " + copiedFiles);
console.log("Patched files: " + validatedPatch.files.length);
console.log("Original repository modified: no");
console.log("AI-generated code executed: no");
