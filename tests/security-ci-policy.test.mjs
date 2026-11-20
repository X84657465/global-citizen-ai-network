import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const headers = readFileSync(new URL("../lib/security/headers.ts", import.meta.url), "utf8");
const dependabot = readFileSync(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
const securityPolicy = readFileSync(new URL("../SECURITY.md", import.meta.url), "utf8");

test("CI grants only read access to repository contents by default", () => {
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.doesNotMatch(workflow, /permissions:\s*\n\s+contents:\s*write/);
});

test("untrusted pull requests cannot reach the privileged self-hosted CI jobs", () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /github\.event\.pull_request\.user\.login == github\.repository_owner/);
  assert.doesNotMatch(workflow, /pull_request_target:/);
  assert.match(workflow, /runs-on:\s*\[self-hosted, Windows, X64\]/);
});

test("CI checks out the exact pull-request head revision", () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
});

test("production dependency audit is a blocking CI gate", () => {
  const auditStep = workflow.match(/- name: Production dependency security audit[\s\S]*?(?=\n      - name:|$)/);
  assert.ok(auditStep, "production dependency audit step must exist");
  assert.match(auditStep[0], /npm audit --omit=dev --audit-level=high/);
  assert.doesNotMatch(auditStep[0], /continue-on-error:\s*true/);
});

test("baseline security headers retain HSTS and clickjacking protection", () => {
  assert.match(headers, /Strict-Transport-Security/);
  assert.match(headers, /max-age=31536000/);
  assert.match(headers, /X-Frame-Options.*DENY/);
});

test("Dependabot monitors npm and GitHub Actions on a scheduled basis", () => {
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /interval: weekly/);
  assert.match(dependabot, /interval: monthly/);
});

test("security policy provides private disclosure and safe testing boundaries", () => {
  assert.match(securityPolicy, /Report a vulnerability/);
  assert.match(securityPolicy, /Do not disclose exploitable vulnerabilities in public/);
  assert.match(securityPolicy, /destructive testing/);
});
