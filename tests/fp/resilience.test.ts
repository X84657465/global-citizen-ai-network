import assert from "node:assert/strict";
import test from "node:test";
import { FPHostAdapter, FPHostError } from "../../lib/fp/host-adapter.ts";
import {
  createFPResilienceProposal,
  registerFPResilienceCapability,
  type FPResilienceEvidence,
} from "../../lib/fp/resilience.ts";

const evidence = (overrides: Partial<FPResilienceEvidence> = {}): FPResilienceEvidence => ({
  schemaVersion: "1",
  source: "provider",
  failureCode: "TIMEOUT",
  evidenceRef: "evidence:42",
  componentRef: "provider:payments",
  occurredAt: "2026-11-22T00:00:00.000Z",
  attemptCount: 1,
  policyDecision: { decision: "allow-advisory", policyVersion: "policy-v3" },
  ...overrides,
});

const context = (authorized = true) => ({
  principal: {
    actorRef: "host-user:1",
    resourceRef: "workspace:2",
    authorized,
    approved: false,
  },
  correlationId: "corr-123",
  now: () => new Date("2026-11-22T00:01:00.000Z"),
});

function host() {
  const adapter = new FPHostAdapter();
  registerFPResilienceCapability({ host: adapter });
  return adapter;
}

test("creates a deterministic advisory proposal from allowlisted evidence", () => {
  const proposal = createFPResilienceProposal(
    evidence(),
    { correlationId: "corr-123" },
    new Date("2026-11-22T00:01:00.000Z"),
  );
  assert.ok(proposal);
  assert.equal(proposal.classification, "TIMEOUT");
  assert.equal(proposal.proposalId, "j:evidence:42:timeout");
  assert.equal(proposal.manualApprovalRequired, true);
  assert.equal(proposal.executionPerformed, false);
  assert.equal(proposal.generatedAt, "2026-11-22T00:01:00.000Z");
  assert.ok(Object.isFrozen(proposal));
  assert.ok(Object.isFrozen(proposal.suggestedChecks));
});

test("policy denial suppresses diagnostic proposals", () => {
  assert.equal(createFPResilienceProposal(
    evidence({ policyDecision: { decision: "deny", policyVersion: "policy-v3" } }),
    { correlationId: "corr-123" },
  ), null);
});

test("registers J through the existing host and does not require execution approval", async () => {
  const result = await host().invoke(
    { workstream: "J", capability: "diagnose", input: evidence() },
    context(true),
  );
  assert.equal(result.envelope.payload?.classification, "TIMEOUT");
  assert.equal(result.envelope.payload?.executionPerformed, false);
});

test("host authorization denial prevents J handler execution", async () => {
  await assert.rejects(
    host().invoke(
      { workstream: "J", capability: "diagnose", input: evidence() },
      context(false),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "UNAUTHORIZED",
  );
});

test("rejects free-form messages, extra fields, and malformed references", () => {
  assert.throws(() => createFPResilienceProposal(
    { ...evidence(), message: "sensitive raw provider response" } as FPResilienceEvidence,
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence({ evidenceRef: "../private" }),
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence({ attemptCount: 0 }),
    { correlationId: "corr-123" },
  ), TypeError);
});

test("rejects unsupported failure codes and malformed policy metadata", () => {
  assert.throws(() => createFPResilienceProposal(
    evidence({ failureCode: "RUN_ARBITRARY_COMMAND" as FPResilienceEvidence["failureCode"] }),
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence({ policyDecision: { decision: "allow-advisory", policyVersion: "../policy" } }),
    { correlationId: "corr-123" },
  ), TypeError);
});

test("validates host correlation and timestamp inputs", () => {
  assert.throws(() => createFPResilienceProposal(
    evidence(),
    { correlationId: "bad\ncorrelation" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence(),
    { correlationId: "corr-123" },
    new Date(Number.NaN),
  ), TypeError);
});

test("returns only fixed, bounded recommendations and never echoes raw evidence", () => {
  const proposal = createFPResilienceProposal(
    evidence({ failureCode: "PERMISSION_DENIED", evidenceRef: "safe-ref" }),
    { correlationId: "corr-123" },
  );
  assert.ok(proposal);
  const serialized = JSON.stringify(proposal);
  assert.equal(serialized.includes("sensitive"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.ok(proposal.suggestedChecks.length <= 3);
  assert.ok(proposal.recommendation.length <= 240);
});
