import assert from "node:assert/strict";
import test from "node:test";
import {
  FPHostAdapter,
  FPHostError,
  type FPHostRequestContext,
} from "../../lib/fp/host-adapter.ts";
import { FPObservabilityRecorder } from "../../lib/fp/observability.ts";

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
      context({ actorRef: "bad\nactor" }),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
});


test("rejects unsafe idempotency metadata before invoking a handler", async () => {
  const host = new FPHostAdapter();
  let invoked = false;
  host.register("H", "health-snapshot", () => {
    invoked = true;
    return "healthy";
  });
  await assert.rejects(
    host.invoke(
      {
        workstream: "H",
        capability: "health-snapshot",
        input: null,
        idempotencyKey: "bad\\nkey",
      },
      context(),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
  assert.equal(invoked, false);
});

test("validates host clock before invoking a capability handler", async () => {
  const host = new FPHostAdapter();
  let invoked = false;
  host.register("H", "health-snapshot", () => {
    invoked = true;
    return "healthy";
  });
  await assert.rejects(
    host.invoke(
      { workstream: "H", capability: "health-snapshot", input: null },
      { ...context(), now: () => new Date(Number.NaN) },
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
  assert.equal(invoked, false);
});


test("fails closed for non-boolean host authorization and approval decisions", async () => {
  const host = new FPHostAdapter();
  let invoked = false;
  host.register("H", "health-snapshot", () => {
    invoked = true;
    return "healthy";
  });
  await assert.rejects(
    host.invoke(
      { workstream: "H", capability: "health-snapshot", input: null },
      context({ authorized: "true" as unknown as boolean }),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
  assert.equal(invoked, false);
});

test("rejects malformed request and principal context without invoking handlers", async () => {
  const host = new FPHostAdapter();
  let invoked = false;
  host.register("H", "health-snapshot", () => {
    invoked = true;
    return "healthy";
  });
  await assert.rejects(
    host.invoke(
      { workstream: "H", capability: "health-snapshot", input: null },
      null as unknown as FPHostRequestContext,
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "INVALID_CONTEXT",
  );
  assert.equal(invoked, false);
});


test("publishes success and denial outcomes to the H recorder without payload data", async () => {
  const recorder = new FPObservabilityRecorder();
  const host = new FPHostAdapter(recorder);
  host.register("H", "health-snapshot", (input: { secret: string }) => ({ accepted: Boolean(input.secret) }));

  await host.invoke(
    { workstream: "H", capability: "health-snapshot", input: { secret: "must-not-be-recorded" } },
    context(),
  );
  await assert.rejects(
    host.invoke(
      { workstream: "H", capability: "health-snapshot", input: null },
      context({ authorized: false }),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "UNAUTHORIZED",
  );

  const events = recorder.list();
  assert.equal(events.length, 2);
  assert.equal(events[0].outcome, "succeeded");
  assert.equal(events[1].outcome, "denied");
  assert.equal(events[0].correlationId, "request-123");
  assert.equal(JSON.stringify(events).includes("must-not-be-recorded"), false);
  assert.equal(recorder.snapshot().totalOutcomes, 2);
});

test("observability sink failures do not change capability results", async () => {
  const host = new FPHostAdapter({
    record() {
      throw new Error("sink unavailable");
    },
  });
  host.register("H", "health-snapshot", () => "still-available");
  const result = await host.invoke(
    { workstream: "H", capability: "health-snapshot", input: null },
    context(),
  );
  assert.equal(result.envelope.payload, "still-available");
});


test("passes an immutable snapshot of trusted host identity and correlation to handlers", async () => {
  const host = new FPHostAdapter();
  let receivedContext: FPHostRequestContext | undefined;
  host.register("H", "health-snapshot", (_input, handlerContext) => {
    receivedContext = handlerContext;
    assert.equal(Object.isFrozen(handlerContext), true);
    assert.equal(Object.isFrozen(handlerContext.principal), true);
    return "healthy";
  });

  const callerContext = context();
  const result = await host.invoke(
    { workstream: "H", capability: "health-snapshot", input: null },
    callerContext,
  );

  assert.ok(receivedContext);
  assert.notEqual(receivedContext, callerContext);
  assert.notEqual(receivedContext.principal, callerContext.principal);
  assert.equal(result.envelope.actorRef, "host-user:123");
  assert.equal(result.envelope.resourceRef, "workspace:456");
  assert.equal(result.envelope.correlationId, "request-123");
  assert.equal(callerContext.principal.actorRef, "host-user:123");
});


test("keeps envelope capability metadata stable if the caller mutates its request during execution", async () => {
  const host = new FPHostAdapter();
  const request = {
    workstream: "H" as const,
    capability: "health-snapshot",
    input: null,
  };
  host.register("H", "health-snapshot", () => {
    request.capability = "mutated-capability";
    return "healthy";
  });

  const result = await host.invoke(request, context());
  assert.equal(request.capability, "mutated-capability");
  assert.equal(result.envelope.capability, "health-snapshot");
});


test("records outcome correlation from the trusted snapshot, not a mutated caller context", async () => {
  const recorder = new FPObservabilityRecorder();
  const host = new FPHostAdapter(recorder);
  const callerContext = context();
  host.register("H", "health-snapshot", () => {
    Reflect.set(callerContext, "correlationId", "tampered-correlation");
    return "healthy";
  });

  await host.invoke(
    { workstream: "H", capability: "health-snapshot", input: null },
    callerContext,
  );

  assert.equal(callerContext.correlationId, "tampered-correlation");
  assert.equal(recorder.list()[0].correlationId, "request-123");
});
