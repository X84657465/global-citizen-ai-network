import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyCiFailure,
  createCiFailureReport,
  redactCiLog,
} from "../lib/ci-failure-diagnostics.mjs";

const sha = "a".repeat(40);
const requiredJobNames = [
  "Resolve exact candidate PR metadata",
  "Windows Runner quality gates — tests, types, lint, audit and production build",
  "Windows Ollama and local execution integration",
  "Windows Supabase migrations, PostgreSQL and RLS integration",
];
const run = (overrides = {}) => ({
  id: 1234,
  run_attempt: 1,
  head_sha: sha,
  workflow_id: 42,
  head_branch: "feat/agent-factory-v2",
  status: "completed",
  conclusion: "failure",
  ...overrides,
});

test("rejects stale SHA evidence", () => {
  assert.throws(
    () => createCiFailureReport({
      run: run({ head_sha: "b".repeat(40) }),
      jobs: [],
      expectedHeadSha: sha,
    }),
    /Stale CI evidence rejected/,
  );
});

test("classifies failure domains", () => {
  assert.equal(classifyCiFailure("HTTP 429"), "quota_rate_limit");
  assert.equal(classifyCiFailure("Docker daemon is not running"), "runner_dependency");
  assert.equal(classifyCiFailure("Supabase migration failed"), "database_migration_rls");
  assert.equal(classifyCiFailure("Cannot find module"), "test_environment");
  assert.equal(classifyCiFailure("AssertionError"), "code_logic");
});

test("extracts failed steps and rejects incomplete CI", () => {
  const report = createCiFailureReport({
    run: run(),
    jobs: [{
      id: 1,
      name: requiredJobNames[1],
      conclusion: "failure",
      steps: [{ name: "unit", conclusion: "failure" }],
    }],
    expectedHeadSha: sha,
    logText: "AssertionError",
  });
  assert.equal(report.complete_ci_pass, false);
  assert.equal(report.failure_category, "code_logic");
  assert.equal(report.failed_steps[0].name, "unit");
  assert.deepEqual(report.required_jobs, requiredJobNames.map((name) => ({
    name,
    conclusion: name === requiredJobNames[1] ? "failure" : "missing_or_not_started",
  })));
});

test("requires all four exact current workflow gates for CI pass", () => {
  const jobs = requiredJobNames.map((name, index) => ({
    id: index + 1,
    name,
    status: "completed",
    conclusion: "success",
    steps: [],
  }));
  const complete = createCiFailureReport({
    run: run({ conclusion: "success" }),
    jobs,
    expectedHeadSha: sha,
  });
  assert.equal(complete.complete_ci_pass, true);
  assert.deepEqual(complete.required_jobs.map((job) => job.conclusion), [
    "success", "success", "success", "success",
  ]);

  const missingResolver = createCiFailureReport({
    run: run({ conclusion: "success" }),
    jobs: jobs.filter((job) => job.name !== requiredJobNames[0]),
    expectedHeadSha: sha,
  });
  assert.equal(missingResolver.complete_ci_pass, false);
  assert.equal(missingResolver.required_jobs[0].conclusion, "missing_or_not_started");

  const skippedQuality = createCiFailureReport({
    run: run({ conclusion: "success" }),
    jobs: jobs.map((job) => job.name === requiredJobNames[1]
      ? { ...job, conclusion: "skipped" }
      : job),
    expectedHeadSha: sha,
  });
  assert.equal(skippedQuality.complete_ci_pass, false);
  assert.equal(skippedQuality.required_jobs[1].conclusion, "skipped");
});

test("detects concurrency wait", () => {
  const pendingRun = run({ status: "pending", conclusion: null });
  const report = createCiFailureReport({
    run: pendingRun,
    jobs: [],
    expectedHeadSha: sha,
    siblingRuns: [{
      id: 99,
      workflow_id: 42,
      head_branch: pendingRun.head_branch,
      status: "pending",
    }],
  });
  assert.equal(report.blocker, "workflow_concurrency_wait");
});

test("detects self-hosted runner queue", () => {
  const report = createCiFailureReport({
    run: run({ status: "in_progress", conclusion: null }),
    jobs: [{
      id: 1,
      status: "queued",
      runner_name: null,
      labels: ["self-hosted", "Windows"],
      steps: [],
    }],
    expectedHeadSha: sha,
  });
  assert.equal(report.blocker, "self_hosted_runner_queue");
});

test("redacts credentials", () => {
  const value = redactCiLog(
    "ghp_abcdefghijklmnopqrstuvwxyz1234567890\nAuthorization: Bearer abcdefghijklmnopqrstuvwxyz123456",
  );
  assert.doesNotMatch(value, /ghp_abcdefghijklmnopqrstuvwxyz|Bearer abcdefghijklmnopqrstuvwxyz/);
  assert.match(value, /REDACTED/);
});


test("records each diagnostics source independently when APIs and logs are unavailable", () => {
  const capture = {
    run_metadata: { status: "UNAVAILABLE", error_class: "HttpRequestError", http_status: 503 },
    jobs: { status: "UNAVAILABLE", error_class: "HttpRequestError", http_status: 503 },
    sibling_runs: { status: "UNAVAILABLE", error_class: "HttpRequestError", http_status: 503 },
    logs: { status: "UNAVAILABLE", error_class: "BlobNotFound", http_status: 404 },
  };
  const report = createCiFailureReport({
    run: run({ status: "unknown", conclusion: null }),
    jobs: [],
    siblingRuns: [],
    expectedHeadSha: sha,
    capture,
  });
  assert.equal(report.complete_ci_pass, false);
  assert.equal(report.failure_category, null);
  assert.deepEqual(report.capture_sources, capture);
  assert.equal(report.required_jobs.every((job) => job.conclusion === "missing_or_not_started"), true);
  assert.equal(report.blocker, "run_metadata_unavailable");
});

test("keeps missing job payloads unknown instead of fabricating successful jobs", () => {
  const report = createCiFailureReport({
    run: run({ conclusion: "success" }),
    jobs: [],
    expectedHeadSha: sha,
    capture: {
      run_metadata: { status: "SUCCESS" },
      jobs: { status: "UNAVAILABLE", error_class: "MalformedPayload" },
      sibling_runs: { status: "SUCCESS" },
      logs: { status: "UNAVAILABLE", error_class: "BlobNotFound" },
    },
  });
  assert.equal(report.complete_ci_pass, false);
  assert.equal(report.blocker, "jobs_metadata_unavailable");
  assert.equal(report.capture_sources.logs.status, "UNAVAILABLE");
  assert.equal(report.required_jobs.every((job) => job.conclusion === "missing_or_not_started"), true);
});


test("preserves independent unavailable status for each diagnostics source", () => {
  for (const source of ["run_metadata", "jobs", "sibling_runs", "logs"]) {
    const capture = {
      run_metadata: { status: "SUCCESS" },
      jobs: { status: "SUCCESS" },
      sibling_runs: { status: "SUCCESS" },
      logs: { status: "SUCCESS" },
    };
    capture[source] = { status: "UNAVAILABLE", error_class: "InjectedFailure", http_status: 503 };
    const report = createCiFailureReport({
      run: run({ status: "completed", conclusion: "failure" }),
      jobs: [],
      expectedHeadSha: sha,
      capture,
    });
    assert.equal(report.complete_ci_pass, false, source);
    assert.equal(report.capture_sources[source].status, "UNAVAILABLE", source);
  }
});

test("workflow retains fallback evidence and uploads diagnostics even after failure", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(workflow, /Initialize fallback CI evidence before checkout/);
  assert.match(workflow, /CI_CAPTURE_STATUS_JSON: \\$\{\{ runner\.temp \/ci-capture-status\.json \}\}/);
  assert.match(workflow, /- name: Upload redacted CI failure evidence\s+if: always\(\)/);
  assert.match(workflow, /if-no-files-found: error/);
});
