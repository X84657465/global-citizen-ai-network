import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8"));
const report = readFileSync(new URL("../../docs/security/dependency-audit-remediation.md", import.meta.url), "utf8");

function lockedVersion(path) {
  const entry = lock.packages?.[path];
  assert.ok(entry, `Expected lockfile entry: ${path}`);
  return entry.version;
}

test("dependency audit report matches the reviewed lockfile baseline", () => {
  assert.equal(lockedVersion("node_modules/next"), "15.5.29");
  assert.equal(lockedVersion("node_modules/eslint"), "9.39.5");
  assert.equal(lockedVersion("node_modules/eslint-config-next"), "15.5.29");
  assert.equal(lockedVersion("node_modules/@next/eslint-plugin-next"), "15.5.29");
  assert.equal(lockedVersion("node_modules/fast-glob"), "3.3.1");
  assert.equal(lockedVersion("node_modules/micromatch"), "4.0.8");
  assert.equal(lockedVersion("node_modules/braces"), "3.0.3");
  assert.equal(lockedVersion("node_modules/picomatch"), "2.3.2");
  assert.equal(lockedVersion("node_modules/tinyglobby"), "0.2.17");
  assert.equal(lockedVersion("node_modules/tinyglobby/node_modules/fdir"), "6.5.0");
  assert.equal(lockedVersion("node_modules/tinyglobby/node_modules/picomatch"), "4.0.7");
});

test("reviewed dependency edges still describe both affected chains", () => {
  const plugin = lock.packages["node_modules/@next/eslint-plugin-next"];
  const fastGlob = lock.packages["node_modules/fast-glob"];
  const micromatch = lock.packages["node_modules/micromatch"];
  const tinyglobby = lock.packages["node_modules/tinyglobby"];

  assert.equal(plugin.dependencies["fast-glob"], "3.3.1");
  assert.equal(fastGlob.dependencies.micromatch, "^4.0.4");
  assert.equal(micromatch.dependencies.braces, "^3.0.3");
  assert.equal(tinyglobby.dependencies.picomatch, "^4.0.4");
  assert.equal(tinyglobby.dependencies.fdir, "^6.5.0");
});

test("report preserves the unresolved advisory and audit evidence requirements", () => {
  assert.match(report, /GHSA-fc5q-39xc-vjpf/);
  assert.match(report, /GHSA-vfj7-8cjw-p6xm/);
  assert.match(report, /no published patched version/i);
  assert.match(report, /npm audit --omit=dev --audit-level=high/);
  assert.match(report, /npm audit --audit-level=high/);
  assert.match(report, /continue-on-error: true/);
  assert.match(report, /Do not use `npm audit fix --force`/);
});
