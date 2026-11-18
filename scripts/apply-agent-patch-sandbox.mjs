import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";
import { validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const [taskArg, planArg, patchArg, projectArg, depsArg, resultArg] = process.argv.slice(2);
if (![taskArg, planArg, patchArg, projectArg, depsArg, resultArg].every(Boolean)) {
  throw new Error("Sandbox requires task, plan, patch, project, dependencies, and result paths.");
}

const inputRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const taskPath = resolve(taskArg);
const planPath = resolve(planArg);
const patchPath = resolve(patchArg);
const projectRoot = resolve(projectArg);
const depsRoot = resolve(depsArg);
const resultPath = resolve(resultArg);
const result = {
  success: false,
  execution_enabled: false,
  source_was_modified: false,
  patch_file_count: 0,
  checks: [],
};

function assertInside(parent, candidate, label) {
  const rel = relative(parent, candidate);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error(label + " must be inside its designated directory.");
}

function assertNoSymlinkSegments(root, path) {
  let current = root;
  for (const segment of path.split("/")) {
    current = resolve(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error("Symbolic links are prohibited for patch targets: " + path);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Symbolic links")) throw error;
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function runCheck(name, command, args) {
  console.log("SANDBOX CHECK: " + name);
  const child = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    timeout: 600000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      CI: "true",
      HOME: "/tmp/home",
      TMPDIR: "/tmp",
      npm_config_cache: "/tmp/npm-cache",
      npm_config_offline: "true",
    },
  });
  const passed = !child.error && child.status === 0;
  result.checks.push({
    name,
    passed,
    exit_code: child.status,
    error: child.error ? child.error.message : null,
  });
  if (!passed) throw new Error(name + " failed inside the disposable container (exit " + child.status + ").");
}

async function main() {
  assertInside("/output", projectRoot, "Scratch project");
  assertInside("/output", resultPath, "Sandbox result");
  if (!existsSync(inputRoot) || !existsSync(depsRoot)) throw new Error("Input repository or dependency mount is unavailable.");

  const task = JSON.parse(readFileSync(taskPath, "utf8"));
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const patch = JSON.parse(readFileSync(patchPath, "utf8"));

  if (task.schema_version !== 1 || task.mode !== "preflight_only" || task.ai_execution_enabled !== false) {
    throw new Error("Task must be validated and execution-disabled.");
  }
  if (plan.execution_mode !== "validated_plan_only" || plan.ai_execution_enabled !== false) {
    throw new Error("Plan must remain execution-disabled.");
  }
  if (patch.safety?.task_path_allowlist_enforced !== true) {
    throw new Error("Patch artifact is missing its task allowlist safety marker.");
  }

  const validatedPlan = validateAgentPlan({ schema_version: plan.schema_version, tasks: plan.tasks }, task);
  const existingPaths = task.allowed_paths.filter((path) => {
    const absolute = resolve(inputRoot, path);
    const rel = relative(inputRoot, absolute);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Task path escaped the input repository.");
    assertNoSymlinkSegments(inputRoot, path);
    return existsSync(absolute) && statSync(absolute).isFile();
  });
  const validatedPatch = validatePatchManifest(
    { schema_version: patch.schema_version, files: patch.files },
    task,
    existingPaths,
  );
  result.patch_file_count = validatedPatch.files.length;

  const sourceHashes = new Map(validatedPatch.files.map((file) => {
    const source = resolve(inputRoot, file.path);
    return [file.path, existsSync(source) ? hashFile(source) : null];
  }));

  rmSync(projectRoot, { recursive: true, force: true });
  mkdirSync(dirname(projectRoot), { recursive: true });
  const excluded = new Set([".git", "node_modules", "artifacts", ".next", ".vercel", "coverage"]);
  cpSync(inputRoot, projectRoot, {
    recursive: true,
    filter(source) {
      const rel = relative(inputRoot, source).split(sep).join("/");
      if (!rel) return true;
      return !excluded.has(rel.split("/")[0]);
    },
  });

  const projectDeps = resolve(projectRoot, "node_modules");
  if (existsSync(projectDeps)) rmSync(projectDeps, { recursive: true, force: true });
  symlinkSync(depsRoot, projectDeps, "dir");

  for (const file of validatedPatch.files) {
    assertNoSymlinkSegments(projectRoot, file.path);
    const target = resolve(projectRoot, file.path);
    const rel = relative(projectRoot, target);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Validated patch escaped the scratch project.");
    const currentlyExists = existsSync(target);
    if (file.operation === "modify" && !currentlyExists) throw new Error("Modify target disappeared in the scratch copy: " + file.path);
    if (file.operation === "add" && currentlyExists) throw new Error("Add target already exists in the scratch copy: " + file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }

  mkdirSync("/tmp/home", { recursive: true });
  mkdirSync("/tmp/npm-cache", { recursive: true });
  runCheck("unit tests", "npm", ["run", "test:unit"]);
  runCheck("TypeScript", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);
  runCheck("ESLint", "npm", ["run", "lint"]);

  for (const [path, before] of sourceHashes) {
    const source = resolve(inputRoot, path);
    const after = existsSync(source) ? hashFile(source) : null;
    if (before !== after) throw new Error("Read-only input repository changed unexpectedly: " + path);
  }

  result.success = true;
  result.execution_enabled = false;
  result.source_was_modified = false;
  result.scratch_only = true;
  result.plan_task_count = validatedPlan.tasks.length;
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log("PASS: patch applied only to scratch copy; unit tests, TypeScript, and ESLint passed in network-isolated Docker.");
}

main().catch((error) => {
  result.success = false;
  result.error = error instanceof Error ? error.message : "Unknown sandbox failure.";
  try {
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  } catch {
    // Preserve the original sandbox error if the result mount is unavailable.
  }
  console.error("Agent patch sandbox failed: " + result.error);
  process.exitCode = 1;
});
