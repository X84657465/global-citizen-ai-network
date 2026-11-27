import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
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
  writeFileSync(join(root, "tests/oracle.test.mjs"), 'import test from "node:test";\\ntest("trusted oracle fixture", () => {});\\n');
  execFileSync("git", ["add", "tests/oracle.test.mjs"], { cwd: root });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  return { root, baseSha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim() };
}

test("trusted Oracle binds exact base SHA and file hashes", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const contract = createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, oracleTestFiles: ["tests/oracle.test.mjs"],
    workerAllowedPaths: ["lib/agent-factory-local-queue.mjs"],
  });
  const verified = verifyTrustedAcceptanceOracle({ repositoryRoot: root, contract });
  assert.equal(verified.valid, true);
  assert.equal(verified.base_sha, baseSha);
  assert.equal(verified.test_file_count, 1);
});

test("trusted Oracle rejects worker write overlap", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, oracleTestFiles: ["tests/oracle.test.mjs"],
    workerAllowedPaths: ["tests"],
  }), /overlaps/);
});

test("trusted Oracle rejects a modified checkout file", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const contract = createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, oracleTestFiles: ["tests/oracle.test.mjs"],
  });
  writeFileSync(join(root, "tests/oracle.test.mjs"), "tampered\\n");
  assert.throws(() => verifyTrustedAcceptanceOracle({ repositoryRoot: root, contract }), /changed/);
});

test("trusted Oracle rejects an empty or untracked test source", (t) => {
  const { root, baseSha } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha, oracleTestFiles: ["tests/missing.test.mjs"],
  }));
});

test("trusted Oracle requires exact checked-out base SHA", (t) => {
  const { root } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createTrustedAcceptanceOracle({
    repositoryRoot: root, baseSha: "0".repeat(40), oracleTestFiles: ["tests/oracle.test.mjs"],
  }), /exact checked-out base SHA/);
});
