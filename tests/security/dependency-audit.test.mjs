import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const reportPath = new URL("../../docs/security/dependency-audit-remediation.md", import.meta.url);
const lockPath = new URL("../../package-lock.json", import.meta.url);
const manifestPath = new URL("../../package.json", import.meta.url);

test("dependency audit report records both exact successful audit scopes", async () => {
  const report = await readFile(reportPath, "utf8");
  assert.match(report, /2789027136f1577af5871d300ad6465cab267cab/);
  assert.match(report, /45916809209/);
  assert.match(report, /140239281189/);
  assert.match(report, /npm audit --omit=dev --audit-level=high/);
  assert.match(report, /npm audit --audit-level=high/);
  assert.equal((report.match(/found 0 vulnerabilities/g) ?? []).length, 2);
  assert.match(report, /point-in-time/);
  assert.match(report, /overall CI is not green/);
});

test("documented tooling versions match the exact locked development dependency tree", async () => {
  const report = await readFile(reportPath, "utf8");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.equal(lock.lockfileVersion, 3);
  assert.equal(manifest.dependencies.next, "15.5.29");
  assert.equal(manifest.devDependencies.eslint, "^9.30.1");
  assert.equal(manifest.devDependencies["eslint-config-next"], "15.5.29");

  const expected = {
    "node_modules/picomatch": "2.3.2",
    "node_modules/tinyglobby/node_modules/picomatch": "4.0.7",
    "node_modules/tinyglobby": "0.2.17",
    "node_modules/tinyglobby/node_modules/fdir": "6.5.0",
    "node_modules/fast-glob": "3.3.1",
    "node_modules/eslint": "9.39.5",
    "node_modules/eslint-config-next": "15.5.29",
  };

  for (const [location, version] of Object.entries(expected)) {
    assert.equal(lock.packages[location]?.version, version, `unexpected locked version at ${location}`);
    assert.equal(lock.packages[location]?.dev, true, `${location} must remain a development dependency`);
    assert.ok(report.includes(`\\`${version}\\``), `report must record ${location} version ${version}`);
  }
});

test("audit report does not imply that a clean dependency scan means all CI or security work passed", async () => {
  const report = await readFile(reportPath, "utf8");
  assert.match(report, /does not assess application logic/);
  assert.match(report, /overall CI is not green/);
  assert.match(report, /No package manifest or lockfile change is proposed/);
});
