import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  createTrustedAcceptanceOracle,
  verifyTrustedAcceptanceOracle,
} from "../lib/agent-factory-trusted-oracle.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "gcan-trusted-oracle-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "factory-test@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Factory Test"], { cwd: root });
  mkdirSync(join(root, "tests"));
  writeFileSync(join(root, "tests/oracle.test.mjs"), 'import test from "node:test";\ntest("trusted oracle fixture", () => {});\n');
  execFileSync("git", ["add", "tests/oracle.test.mjs"], { cwd: root });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  return { root, baseSha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim() };
}

test("trusted Oracle binds exact base SHA and file hashes", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const contract = createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, taskId: "oracle-fixture-task", oracleTestFiles: ["tests/oracle.test.mjs"],
    workerAllowedPaths: ["lib/agent-factory-local-queue.mjs"],
  });
  const verified = verifyTrustedAcceptanceOracle({ repositoryRoot: root, contract, taskId: "oracle-fixture-task" });
  assert.equal(verified.valid, true);
  assert.equal(contract.schema_version, 2);
  assert.match(contract.contract_sha256, /^[a-f0-9]{64}$/);
  assert.equal(verified.base_sha, baseSha);
  assert.equal(verified.test_file_count, 1);
});

test("trusted Oracle rejects worker write overlap", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, taskId: "oracle-fixture-task", oracleTestFiles: ["tests/oracle.test.mjs"],
    workerAllowedPaths: ["tests/oracle.test.mjs"],
  }), /overlaps/);
});

test("trusted Oracle rejects Windows case-insensitive path aliases", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root,
    baseSha,
    taskId: "oracle-fixture-task",
    oracleTestFiles: ["tests/oracle.test.mjs"],
    workerAllowedPaths: ["tests/ORACLE.test.mjs"],
  }), /overlaps/);
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root,
    baseSha,
    taskId: "oracle-fixture-task",
    oracleTestFiles: ["tests/oracle.test.mjs", "tests/ORACLE.test.mjs"],
  }), /unique/);
});

test("trusted Oracle accepts Windows CRLF checkout when Git blob identity is unchanged", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["config", "core.autocrlf", "true"], { cwd: root });
  const contract = createTrustedAcceptanceOracle({
    repositoryRoot: root,
    baseSha,
    taskId: "oracle-fixture-task",
    oracleTestFiles: ["tests/oracle.test.mjs"],
  });
  const path = join(root, "tests/oracle.test.mjs");
  const lf = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  writeFileSync(path, crlf);
  const written = readFileSync(path);
  assert.ok(written.includes(Buffer.from("\r\n")), "fixture must contain actual CRLF bytes");
  for (let index = 0; index < written.length; index += 1) {
    if (written[index] === 0x0a) assert.equal(written[index - 1], 0x0d, "fixture must not contain a bare LF");
  }
  const verified = verifyTrustedAcceptanceOracle({
    repositoryRoot: root,
    contract,
    taskId: "oracle-fixture-task",
  });
  assert.equal(verified.valid, true);
  assert.equal(verified.oracle_sha256, contract.oracle_sha256);
});

test("trusted Oracle rejects a modified checkout file", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const contract = createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, taskId: "oracle-fixture-task", oracleTestFiles: ["tests/oracle.test.mjs"],
  });
  writeFileSync(join(root, "tests/oracle.test.mjs"), "tampered\n");
  assert.throws(() => verifyTrustedAcceptanceOracle({ repositoryRoot: root, contract, taskId: "oracle-fixture-task" }), /changed/);
});

test("trusted Oracle rejects an empty or untracked test source", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, taskId: "oracle-fixture-task", oracleTestFiles: ["tests/missing.test.mjs"],
  }));
});

test("trusted Oracle requires exact checked-out base SHA", (t) => {
  const { root } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha: "0".repeat(40), taskId: "oracle-fixture-task", oracleTestFiles: ["tests/oracle.test.mjs"],
  }), /exact checked-out base SHA/);
});


test("complete contract digest binds task identity, base SHA and worker allowlist", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const base = {
    repositoryRoot: root,
    baseSha,
    taskId: "oracle-fixture-task",
    oracleTestFiles: ["tests/oracle.test.mjs"],
  };
  const first = createTrustedAcceptanceOracle({
    ...base,
    workerAllowedPaths: ["lib/agent-factory-local-queue.mjs"],
  });
  const differentAllowlist = createTrustedAcceptanceOracle({
    ...base,
    workerAllowedPaths: ["docs/local-factory.md"],
  });
  assert.equal(first.oracle_sha256, differentAllowlist.oracle_sha256);
  assert.notEqual(first.contract_sha256, differentAllowlist.contract_sha256);

  execFileSync("git", ["commit", "--allow-empty", "-m", "advance exact base"], {
    cwd: root, stdio: "ignore",
  });
  const nextBase = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root, encoding: "utf8",
  }).trim();
  const differentBase = createTrustedAcceptanceOracle({
    ...base,
    baseSha: nextBase,
    workerAllowedPaths: ["lib/agent-factory-local-queue.mjs"],
  });
  assert.equal(first.oracle_sha256, differentBase.oracle_sha256);
  assert.notEqual(first.contract_sha256, differentBase.contract_sha256);
  assert.throws(
    () => verifyTrustedAcceptanceOracle({
      repositoryRoot: root, contract: first, taskId: "different-task",
    }),
    /another task/,
  );
});
