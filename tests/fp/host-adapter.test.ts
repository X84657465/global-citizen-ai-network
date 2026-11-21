import assert from "node:assert/strict";
import test from "node:test";
import {
  FPHostAdapter,
  FPHostError,
  type FPHostRequestContext,
} from "../../lib/fp/host-adapter.ts";

const context = (overrides: Partial<FPHostRequestContext["principal"]> = {}): FPHostRequestContext => ({
  principal: {
    actorRef: "host-user:123",
    resourceRef: "workspace:456",
    authorized: true,
    approved: false,
    ...overrides,
  },
  correlationId: "request-123",
  now: () => new Date("2026-11-21T12:00:00.000Z"),
});

test("invokes an advisory F-P capability through host-supplied authorization", async () => {
  const host = new FPHostAdapter();
  host.register("H", "health-snapshot", (input: { status: string }) => input);
  const result = await host.invoke(
    { workstream: "H", capability: "health-snapshot", input: { status: "healthy" } },
    context(),
  );

  assert.equal(result.envelope.workstream, "H");
  assert.equal(result.envelope.contractVersion, "1");
  assert.equal(result.envelope.correlationId, "request-123");
  assert.equal(result.envelope.actorRef, "host-user:123");
  assert.deepEqual(result.envelope.payload, { status: "healthy" });
  assert.equal(result.envelope.occurredAt, "2026-11-21T12:00:00.000Z");
});

test("rejects calls the existing host has not authorized", async () => {
  const host = new FPHostAdapter();
  host.register("H", "health-snapshot", () => "should not run");
  await assert.rejects(
    host.invoke({ workstream: "H", capability: "health-snapshot", input: null }, context({ authorized: false })),
    (error: unknown) => error instanceof FPHostError && error.code === "UNAUTHORIZED",
  );
});

test("requires explicit host approval for bounded I capabilities", async () => {
  const host = new FPHostAdapter();
  host.register("I", "external-sync", () => "synced");
  await assert.rejects(
    host.invoke({ workstream: "I", capability: "external-sync", input: null }, context()),
    (error: unknown) => error instanceof FPHostError && error.code === "APPROVAL_REQUIRED",
  );
  const result = await host.invoke(
    { workstream: "I", capability: "external-sync", input: null },
    context({ approved: true }),
  );
  assert.equal(result.envelope.payload, "synced");
});

test("does not execute workstreams registered as non-executable", async () => {
  const host = new FPHostAdapter();
  host.register("K", "publish-doc", () => "should not run");
  await assert.rejects(
    host.invoke({ workstream: "K", capability: "publish-doc", input: null }, context()),
    (error: unknown) => error instanceof FPHostError && error.code === "EXECUTION_DISABLED",
  );
});

test("rejects malformed correlation IDs and duplicate capability registrations", async () => {
  const host = new FPHostAdapter();
  host.register("H", "health-snapshot", () => "healthy");
  assert.throws(
    () => host.register("H", "health-snapshot", () => "duplicate"),
    (error: unknown) => error instanceof FPHostError && error.code === "UNKNOWN_CAPABILITY",
  );
  await assert.rejects(
    host.invoke(
      { workstream: "H", capability: "health-snapshot", input: null },
      { ...context(), correlationId: "bad\\ncorrelation" },
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
});

test("rejects missing and unsafe host identity references", async () => {
  const host = new FPHostAdapter();
  host.register("H", "health-snapshot", () => "healthy");
  await assert.rejects(
    host.invoke(
      { workstream: "H", capability: "health-snapshot", input: null },
      context({ actorRef: "bad\\nactor" }),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
});
