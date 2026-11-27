import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

const SHA_RE = /^[a-f0-9]{40}$/;
const MAX_ORACLE_FILES = 32;
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
  return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
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

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readTrackedAtCommit(repositoryRoot, baseSha, path) {
  const blobSha = git(repositoryRoot, ["rev-parse", baseSha + ":" + path]).trim();
  if (!SHA_RE.test(blobSha)) fail("Oracle source is not a tracked Git blob.");
  const bytes = Buffer.from(git(repositoryRoot, ["show", baseSha + ":" + path]), "utf8");
  if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES) fail("Oracle source is empty or exceeds the size limit.");
  return { blobSha, bytes };
}

function verifyCheckoutFile(repositoryRoot, path, expectedDigest) {
  const absolute = resolve(repositoryRoot, path);
  const root = realpathSync(repositoryRoot);
  if (absolute !== root && !absolute.startsWith(root + sep)) fail("Oracle path escapes the repository.");
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("Oracle source must be a regular non-symlink file.");
  const actual = digest(readFileSync(absolute));
  if (actual !== expectedDigest) fail("Trusted Oracle file changed after its contract was created: " + path);
}

export function createTrustedAcceptanceOracle({
  repositoryRoot,
  baseSha,
  oracleTestFiles,
  workerAllowedPaths = [],
} = {}) {
  if (typeof repositoryRoot !== "string" || !repositoryRoot || !SHA_RE.test(baseSha ?? "")) {
    fail("Repository root and exact 40-character base SHA are required.");
  }
  if (!Array.isArray(oracleTestFiles) || oracleTestFiles.length < 1 ||
      oracleTestFiles.length > MAX_ORACLE_FILES) fail("Oracle requires 1–32 trusted test files.");
  if (!Array.isArray(workerAllowedPaths)) fail("Worker allowlist must be an array.");

  const oraclePaths = [...new Set(oracleTestFiles.map(safePath))].sort();
  if (oraclePaths.length !== oracleTestFiles.length) fail("Oracle test paths must be unique.");
  const workerPaths = workerAllowedPaths.map(safePath);
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

  const files = oraclePaths.map((path) => {
    const tracked = readTrackedAtCommit(repositoryRoot, baseSha, path);
    const sha256 = digest(tracked.bytes);
    verifyCheckoutFile(repositoryRoot, path, sha256);
    return Object.freeze({ path, git_blob_sha: tracked.blobSha, sha256 });
  });

  return Object.freeze({
    schema_version: 1,
    kind: "trusted-acceptance-oracle",
    base_sha: baseSha,
    files: Object.freeze(files),
    worker_allowed_paths: Object.freeze([...new Set(workerPaths)].sort()),
    oracle_sha256: digest(Buffer.from(files.map((file) =>
      file.path + "\\0" + file.git_blob_sha + "\\0" + file.sha256).join("\\n"))),
  });
}

export function verifyTrustedAcceptanceOracle({ repositoryRoot, contract } = {}) {
  if (!contract || contract.schema_version !== 1 ||
      contract.kind !== "trusted-acceptance-oracle" ||
      !SHA_RE.test(contract.base_sha ?? "") ||
      !Array.isArray(contract.files) || contract.files.length < 1 ||
      contract.files.length > MAX_ORACLE_FILES ||
      !Array.isArray(contract.worker_allowed_paths)) {
    fail("Trusted Oracle contract is malformed.");
  }
  const paths = contract.files.map((file) => safePath(file?.path));
  if (new Set(paths).size !== paths.length) fail("Trusted Oracle contract contains duplicate paths.");
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
    verifyCheckoutFile(repositoryRoot, file.path, file.sha256);
  }
  const expectedOracleHash = digest(Buffer.from(contract.files.map((file) =>
    file.path + "\\0" + file.git_blob_sha + "\\0" + file.sha256).join("\\n")));
  if (expectedOracleHash !== contract.oracle_sha256) fail("Trusted Oracle aggregate hash mismatch.");
  return Object.freeze({
    valid: true,
    base_sha: contract.base_sha,
    oracle_sha256: contract.oracle_sha256,
    test_files: Object.freeze([...paths]),
    test_file_count: paths.length,
  });
}
