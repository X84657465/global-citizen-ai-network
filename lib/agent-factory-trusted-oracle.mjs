import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

const SHA_RE = /^[a-f0-9]{40}$/;
const MAX_ORACLE_FILES = 32;
const MAX_WORKER_PATHS = 20;
const MAX_FILE_BYTES = 256 * 1024;

function fail(message) {
  const error = new Error(message);
  error.name = "TrustedAcceptanceOracleError";
  error.code = "TRUSTED_ORACLE_INVALID";
  throw error;
}

function safePath(value) {
  if (typeof value !== "string" || value.length > 240 || value.includes("\\") ||
      value.startsWith("/") || /^[A-Za-z]:/.test(value)) fail("Oracle path is invalid.");
  const parts = value.split("/");
  if (parts.length < 2 || parts.some((part) => !part || part === "." || part === ".." ||
      !/^[A-Za-z0-9._-]+$/.test(part))) fail("Oracle path contains an unsafe segment.");
  if (parts.some((part) => part.startsWith(".") || part.toLowerCase().includes("secret") ||
      part.toLowerCase().includes("credential") || part.toLowerCase().startsWith(".env"))) {
    fail("Oracle path is outside the trusted test-file policy.");
  }
  return value;
}

function overlaps(a, b) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left === right || left.startsWith(right + "/") || right.startsWith(left + "/");
}

function git(repositoryRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    });
  } catch {
    fail("Unable to verify trusted Oracle against the requested Git commit.");
  }
}

function gitBuffer(repositoryRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: MAX_FILE_BYTES + 1,
    });
  } catch {
    fail("Unable to read trusted Oracle Git blob bytes.");
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validTaskId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(value);
}

function canonicalContractBytes(contract) {
  return Buffer.from(JSON.stringify({
    schema_version: contract.schema_version,
    kind: contract.kind,
    task_id: contract.task_id,
    base_sha: contract.base_sha,
    files: contract.files.map((file) => ({
      path: file.path,
      git_blob_sha: file.git_blob_sha,
      sha256: file.sha256,
    })),
    worker_allowed_paths: contract.worker_allowed_paths,
    oracle_sha256: contract.oracle_sha256,
  }), "utf8");
}

function assertCleanWorkerPaths(repositoryRoot, paths) {
  if (paths.length === 0) return;
  const status = git(repositoryRoot, ["status", "--porcelain", "--ignored", "--", ...paths]).trim();
  if (status) fail("Worker allowlist contains uncommitted or untracked changes at intake/verification.");
}

function readTrackedAtCommit(repositoryRoot, baseSha, path) {
  const blobSha = git(repositoryRoot, ["rev-parse", baseSha + ":" + path]).trim();
  if (!SHA_RE.test(blobSha)) fail("Oracle source is not a tracked Git blob.");
  const bytes = gitBuffer(repositoryRoot, ["cat-file", "blob", blobSha]);
  if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES) fail("Oracle source is empty or exceeds the size limit.");
  return { blobSha, bytes };
}

function verifyCheckoutFile(repositoryRoot, path, expectedBlobSha, expectedDigest) {
  const absolute = resolve(repositoryRoot, path);
  const root = realpathSync(repositoryRoot);
  if (absolute !== root && !absolute.startsWith(root + sep)) fail("Oracle path escapes the repository.");
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("Oracle source must be a regular non-symlink file.");
  const real = realpathSync(absolute);
  if (real !== root && !real.startsWith(root + sep)) fail("Trusted Oracle file resolves outside the repository.");

  // Compare Git's clean-filtered worktree object identity, not raw bytes:
  // Windows core.autocrlf and .gitattributes may legitimately convert LF to CRLF.
  const worktreeBlobSha = git(repositoryRoot, [
    "hash-object", "--path=" + path, "--", real,
  ]).trim();
  if (worktreeBlobSha !== expectedBlobSha) {
    fail("Trusted Oracle file changed after its contract was created: " + path);
  }
  const committedBytes = gitBuffer(repositoryRoot, ["cat-file", "blob", expectedBlobSha]);
  if (digest(committedBytes) !== expectedDigest) {
    fail("Trusted Oracle Git blob SHA-256 does not match its contract: " + path);
  }
}

export function createTrustedAcceptanceOracle({
  repositoryRoot,
  baseSha,
  taskId,
  oracleTestFiles,
  workerAllowedPaths = [],
} = {}) {
  if (typeof repositoryRoot !== "string" || !repositoryRoot || !SHA_RE.test(baseSha ?? "") ||
      !validTaskId(taskId)) {
    fail("Repository root, task identity and exact 40-character base SHA are required.");
  }
  if (!Array.isArray(oracleTestFiles) || oracleTestFiles.length < 1 ||
      oracleTestFiles.length > MAX_ORACLE_FILES) fail("Oracle requires 1–32 trusted test files.");
  if (!Array.isArray(workerAllowedPaths)) fail("Worker allowlist must be an array.");

  const oraclePaths = oracleTestFiles.map(safePath).sort();
  if (new Set(oraclePaths.map((path) => path.toLowerCase())).size !== oraclePaths.length) {
    fail("Oracle test paths must be unique, including case-insensitive aliases.");
  }
  if (workerAllowedPaths.length > MAX_WORKER_PATHS) fail("Worker allowlist exceeds 20 paths.");
  const workerPaths = workerAllowedPaths.map(safePath).sort();
  if (new Set(workerPaths.map((path) => path.toLowerCase())).size !== workerPaths.length) {
    fail("Worker allowlist paths must be unique, including case-insensitive aliases.");
  }
  for (const oraclePath of oraclePaths) {
    if (!oraclePath.startsWith("tests/") || !oraclePath.endsWith(".test.mjs")) {
      fail("Trusted Oracle files must be tracked test modules under tests/.");
    }
    if (workerPaths.some((workerPath) => overlaps(oraclePath, workerPath))) {
      fail("Worker write allowlist overlaps a trusted Oracle file.");
    }
  }

  const actualHead = git(repositoryRoot, ["rev-parse", "HEAD"]).trim();
  if (actualHead !== baseSha) fail("Oracle must be captured from the exact checked-out base SHA.");
  assertCleanWorkerPaths(repositoryRoot, workerPaths);

  const files = oraclePaths.map((path) => {
    const tracked = readTrackedAtCommit(repositoryRoot, baseSha, path);
    const sha256 = digest(tracked.bytes);
    verifyCheckoutFile(repositoryRoot, path, tracked.blobSha, sha256);
    return Object.freeze({ path, git_blob_sha: tracked.blobSha, sha256 });
  });

  const contract = {
    schema_version: 2,
    kind: "trusted-acceptance-oracle",
    task_id: taskId,
    base_sha: baseSha,
    files: Object.freeze(files),
    worker_allowed_paths: Object.freeze(workerPaths),
    oracle_sha256: digest(Buffer.from(files.map((file) =>
      file.path + "\\0" + file.git_blob_sha + "\\0" + file.sha256).join("\\n"))),
  };
  return Object.freeze({
    ...contract,
    contract_sha256: digest(canonicalContractBytes(contract)),
  });
}

export function verifyTrustedAcceptanceOracle({ repositoryRoot, contract, taskId } = {}) {
  if (!contract || Object.keys(contract).sort().join(",") !==
      "base_sha,contract_sha256,files,kind,oracle_sha256,schema_version,task_id,worker_allowed_paths" ||
      contract.schema_version !== 2 ||
      contract.kind !== "trusted-acceptance-oracle" ||
      !validTaskId(contract.task_id) ||
      !validTaskId(taskId) || taskId !== contract.task_id ||
      !SHA_RE.test(contract.base_sha ?? "") ||
      !Array.isArray(contract.files) || contract.files.length < 1 ||
      contract.files.length > MAX_ORACLE_FILES ||
      !Array.isArray(contract.worker_allowed_paths) ||
      contract.worker_allowed_paths.length > MAX_WORKER_PATHS) {
    fail("Trusted Oracle contract is malformed or belongs to another task.");
  }
  const paths = contract.files.map((file) => {
    if (!file || Object.keys(file).sort().join(",") !== "git_blob_sha,path,sha256") {
      fail("Trusted Oracle file record is malformed.");
    }
    return safePath(file.path);
  });
  if (new Set(paths.map((path) => path.toLowerCase())).size !== paths.length ||
      paths.join("\\n") !== [...paths].sort().join("\\n")) {
    fail("Trusted Oracle paths must be unique and canonical.");
  }
  const workerPaths = contract.worker_allowed_paths.map(safePath);
  if (new Set(workerPaths.map((path) => path.toLowerCase())).size !== workerPaths.length ||
      workerPaths.join("\\n") !== [...workerPaths].sort().join("\\n")) {
    fail("Worker allowlist paths must be unique and canonical.");
  }
  const actualHead = git(repositoryRoot, ["rev-parse", "HEAD"]).trim();
  if (actualHead !== contract.base_sha) fail("Trusted Oracle base SHA no longer matches the exact checkout.");
  assertCleanWorkerPaths(repositoryRoot, workerPaths);
  for (const file of contract.files) {
    if (!SHA_RE.test(file.git_blob_sha ?? "") || !/^[a-f0-9]{64}$/.test(file.sha256 ?? "")) {
      fail("Trusted Oracle contract contains invalid content hashes.");
    }
    if (!file.path.startsWith("tests/") || !file.path.endsWith(".test.mjs")) {
      fail("Trusted Oracle path is outside the test module policy.");
    }
    if (contract.worker_allowed_paths.some((path) => overlaps(file.path, safePath(path)))) {
      fail("Worker write allowlist overlaps a trusted Oracle file.");
    }
    const tracked = readTrackedAtCommit(repositoryRoot, contract.base_sha, file.path);
    if (tracked.blobSha !== file.git_blob_sha || digest(tracked.bytes) !== file.sha256) {
      fail("Trusted Oracle Git evidence does not match its contract.");
    }
    verifyCheckoutFile(repositoryRoot, file.path, file.git_blob_sha, file.sha256);
  }
  const expectedOracleHash = digest(Buffer.from(contract.files.map((file) =>
    file.path + "\\0" + file.git_blob_sha + "\\0" + file.sha256).join("\\n")));
  if (expectedOracleHash !== contract.oracle_sha256) fail("Trusted Oracle aggregate hash mismatch.");
  if (!/^[a-f0-9]{64}$/.test(contract.contract_sha256 ?? "") ||
      digest(canonicalContractBytes(contract)) !== contract.contract_sha256) {
    fail("Trusted Oracle policy contract digest mismatch.");
  }
  return Object.freeze({
    valid: true,
    task_id: contract.task_id,
    base_sha: contract.base_sha,
    oracle_sha256: contract.oracle_sha256,
    contract_sha256: contract.contract_sha256,
    worker_allowed_paths: Object.freeze([...workerPaths]),
    test_files: Object.freeze([...paths]),
    test_file_count: paths.length,
  });
}
