import assert from "node:assert/strict";
import test from "node:test";
import { FPHostAdapter, FPHostError } from "../../lib/fp/host-adapter.ts";
import {
  createFPResilienceProposal,
  registerFPResilienceCapability,
  type FPResilienceEvidence,
  type FPResiliencePolicyDecision,
} from "../../lib/fp/resilience.ts";

const evidence = (overrides: Partial<FPResilienceEvidence> = {}): FPResilienceEvidence => ({
  schemaVersion: "1",
  source: "provider",
  failureCode: "TIMEOUT",
  evidenceRef: "evidence:42",
  componentRef: "provider:payments",
  occurredAt: "2026-11-22T00:00:00.000Z",
  attemptCount: 1,
  ...overrides,
});

const allow: FPResiliencePolicyDecision = {
  decision: "allow-advisory",
  policyVersion: "policy-v3",
};

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

function host(policyDecision: FPResiliencePolicyDecision = allow) {
  const adapter = new FPHostAdapter();
  const policyCalls: string[] = [];
  registerFPResilienceCapability({
    host: adapter,
    policy: {
      evaluate(input, principal) {
        policyCalls.push(principal.actorRef);
        assert.equal(input.evidenceRef, "evidence:42");
        return policyDecision;
      },
    },
  });
  return { adapter, policyCalls };
}

test("creates a deterministic advisory proposal from allowlisted evidence", () => {
  const proposal = createFPResilienceProposal(
    evidence(),
    allow,
    { correlationId: "corr-123" },
    new Date("2026-11-22T00:01:00.000Z"),
  );
  assert.ok(proposal);
  assert.equal(proposal.classification, "TIMEOUT");
  assert.equal(proposal.proposalId, "j:evidence:42:timeout");
  assert.equal(proposal.policyVersion, "policy-v3");
  assert.equal(proposal.manualApprovalRequired, true);
  assert.equal(proposal.executionPerformed, false);
  assert.equal(proposal.generatedAt, "2026-11-22T00:01:00.000Z");
  assert.ok(Object.isFrozen(proposal));
  assert.ok(Object.isFrozen(proposal.suggestedChecks));
});

test("trusted P policy denial suppresses diagnostic proposals", () => {
  assert.equal(createFPResilienceProposal(
    evidence(),
    { decision: "deny", policyVersion: "policy-v3" },
    { correlationId: "corr-123" },
  ), null);
});

test("registers J through the existing host and obtains policy from trusted P provider", async () => {
  const f = host();
  const result = await f.adapter.invoke(
    { workstream: "J", capability: "diagnose", input: evidence() },
    context(true),
  );
  assert.equal(result.envelope.payload?.classification, "TIMEOUT");
  assert.equal(result.envelope.payload?.executionPerformed, false);
  assert.deepEqual(f.policyCalls, ["host-user:1"]);
});

test("host authorization denial prevents policy lookup and J execution", async () => {
  const f = host();
  await assert.rejects(
    f.adapter.invoke(
      { workstream: "J", capability: "diagnose", input: evidence() },
      context(false),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "UNAUTHORIZED",
  );
  assert.deepEqual(f.policyCalls, []);
});

test("trusted policy denial returns no proposal", async () => {
  const f = host({ decision: "deny", policyVersion: "policy-v3" });
  const result = await f.adapter.invoke(
    { workstream: "J", capability: "diagnose", input: evidence() },
    context(true),
  );
  assert.equal(result.envelope.payload, null);
});

test("rejects free-form messages, extra fields, and malformed references", () => {
  assert.throws(() => createFPResilienceProposal(
    { ...evidence(), message: "sensitive raw provider response" } as FPResilienceEvidence,
    allow,
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence({ evidenceRef: "../private" }),
    allow,
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence({ attemptCount: 0 }),
    allow,
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence({ attemptCount: 1_000_001 }),
    allow,
    { correlationId: "corr-123" },
  ), TypeError);
});

test("rejects unsupported failure codes and malformed trusted policy metadata", () => {
  assert.throws(() => createFPResilienceProposal(
    evidence({ failureCode: "RUN_ARBITRARY_COMMAND" as FPResilienceEvidence["failureCode"] }),
    allow,
    { correlationId: "corr-123" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence(),
    { decision: "allow-advisory", policyVersion: "../policy" },
    { correlationId: "corr-123" },
  ), TypeError);
});

test("validates host correlation and timestamp inputs", () => {
  assert.throws(() => createFPResilienceProposal(
    evidence(),
    allow,
    { correlationId: "bad\ncorrelation" },
  ), TypeError);
  assert.throws(() => createFPResilienceProposal(
    evidence(),
    allow,
    { correlationId: "corr-123" },
    new Date(Number.NaN),
  ), TypeError);
});

test("returns only fixed, bounded recommendations and never echoes raw evidence", () => {
  const proposal = createFPResilienceProposal(
    evidence({ failureCode: "PERMISSION_DENIED", evidenceRef: "safe-ref" }),
    allow,
    { correlationId: "corr-123" },
  );
  assert.ok(proposal);
  const serialized = JSON.stringify(proposal);
  assert.equal(serialized.includes("sensitive"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.ok(proposal.suggestedChecks.length <= 3);
  assert.ok(proposal.recommendation.length <= 240);
});
