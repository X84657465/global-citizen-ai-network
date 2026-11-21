import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  FP_WORKSTREAM_CONTRACTS,
  type WorkstreamId,
} from "../../lib/fp/integration-contract.ts";
import { FP_SECURITY_CONTROLS } from "../../lib/fp/security-assurance.ts";
import { G_REQUIRED_CI_JOBS } from "../../lib/fp/release-assurance.ts";
import { FP_GOVERNANCE_REQUIREMENTS, FP_GOVERNANCE_POLICY_VERSION } from "../../lib/fp/governance-assurance.ts";
import { collectFPGovernanceReviewEvidence } from "../../lib/fp/governance-review-source.ts";

const readRepositoryFile = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const ciWorkflow = readRepositoryFile(".github/workflows/ci.yml");
const middleware = readRepositoryFile("middleware.ts");
const correlationHelper = readRepositoryFile("lib/observability/request-context.ts");
const databasePrivilegeRegression = readRepositoryFile("supabase/tests/public_table_grants.test.sql");
const schedulerRunbook = readRepositoryFile("docs/ai-agent-scheduler-operations.md");

test("F–G shared-run evaluator and its regression suite are present in the mainline integration", () => {
  assert.ok(existsSync(new URL("../../lib/fp/f-g-integration-assurance.ts", import.meta.url)));
  assert.ok(existsSync(new URL("../../tests/fp/f-g-integration-assurance.test.ts", import.meta.url)));
});

test("F security evidence paths exist and map to the CI job that executes them", () => {
  assert.ok(databasePrivilegeRegression.includes("pg_has_role(api.rolname, privileged.oid, 'MEMBER')"));
  assert.ok(databasePrivilegeRegression.includes("privileged.rolsuper or privileged.rolbypassrls"));
  for (const control of FP_SECURITY_CONTROLS) {
    assert.ok(
      existsSync(new URL(`../../${control.evidencePath}`, import.meta.url)),
      `F control ${control.id} points to a missing evidence path: ${control.evidencePath}`,
    );
    assert.ok(
      ciWorkflow.includes(`  ${control.requiredJob}:\n`),
      `F control ${control.id} requires an unknown CI job: ${control.requiredJob}`,
    );
  }
});

test("G required exact-head jobs remain real jobs in the shared CI workflow", () => {
  for (const jobId of G_REQUIRED_CI_JOBS) {
    assert.ok(ciWorkflow.includes(`  ${jobId}:\n`), `G requires missing CI job ${jobId}`);
  }
  assert.ok(ciWorkflow.includes("run-name: CI — ${{ github.event.pull_request.head.sha || github.sha }}"));
  assert.ok(ciWorkflow.includes("ref: ${{ github.event_name == 'repository_dispatch'"));
});

test("H request correlation is generated/reused at the existing platform edge", () => {
  assert.ok(middleware.includes("createCorrelationContext(request.headers)"));
  assert.ok(middleware.includes("request: { headers: new Headers(correlation.requestHeaders) }"));
  assert.ok(middleware.includes("correlation.responseHeaders.forEach((value, key) =>"));
  assert.ok(correlationHelper.includes('export const CORRELATION_ID_HEADER = "x-correlation-id"'));
  assert.ok(correlationHelper.includes("globalThis.crypto.randomUUID()"));
  assert.ok(correlationHelper.includes("export function createCorrelationContext(headers: Headers)"));
  assert.ok(correlationHelper.includes("requestHeaders.set(CORRELATION_ID_HEADER, correlationId)"));
  assert.ok(correlationHelper.includes("responseHeaders.set(CORRELATION_ID_HEADER, correlationId)"));
});

test("F–P registry owns only F–P and retains the approved authority ceiling", () => {
  const ids = FP_WORKSTREAM_CONTRACTS.map((item) => item.id);
  assert.deepEqual(ids, ["F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]);
  for (const protectedTrack of ["A", "B", "C", "D", "E"]) {
    assert.equal(ids.includes(protectedTrack as WorkstreamId), false);
  }
  const authority = Object.fromEntries(FP_WORKSTREAM_CONTRACTS.map((item) => [item.id, item.executionAuthority]));
  assert.deepEqual(authority, {
    F: "advisory",
    G: "advisory",
    H: "advisory",
    I: "bounded",
    J: "advisory",
    K: "none",
    L: "none",
    M: "advisory",
    N: "none",
    O: "advisory",
    P: "advisory",
  });
});

test("P governance requirements cover every F–P line and keep L explicitly deferred", () => {
  assert.deepEqual(
    FP_GOVERNANCE_REQUIREMENTS.map((item) => item.workstream),
    ["F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
  );
  assert.equal(FP_WORKSTREAM_CONTRACTS.find((item) => item.id === "L")?.executionAuthority, "none");
  assert.equal(FP_GOVERNANCE_POLICY_VERSION, "gcan-fp-governance/2");
  const governance = readRepositoryFile("lib/fp/governance-assurance.ts");
  assert.ok(governance.includes("reviewerAuthorizationStatus"));
  assert.ok(governance.includes("reviewedSha.toLowerCase() !== candidateSha.toLowerCase()"));
  assert.ok(governance.includes("governanceApprovalGranted: false"));
  assert.ok(governance.includes("mergeAuthorized: false"));
  assert.ok(existsSync(new URL("../../lib/fp/governance-review-source.ts", import.meta.url)));
  assert.equal(typeof collectFPGovernanceReviewEvidence, "function");
  assert.match(schedulerRunbook, /does not approve the candidate, authorize a merge, or deploy production/);
});
