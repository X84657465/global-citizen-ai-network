import assert from "node:assert/strict";
import test from "node:test";
import { FPObservabilityRecorder } from "../../lib/fp/observability.ts";

const event = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "1" as const,
  eventType: "fp.capability.outcome" as const,
  workstream: "H" as const,
  capability: "health-snapshot",
  correlationId: "corr-1",
  outcome: "succeeded" as const,
  occurredAt: "2026-11-21T12:00:00.000Z",
  durationMs: 12,
  ...overrides,
});

test("records privacy-minimized outcomes and calculates health counters", () => {
  const recorder = new FPObservabilityRecorder();
  recorder.record(event({ errorCode: "UPSTREAM_TIMEOUT" }));
  recorder.record(event({ workstream: "F", outcome: "denied", durationMs: 2 }));
  const snapshot = recorder.snapshot(new Date("2026-11-21T12:01:00.000Z"));

  assert.equal(snapshot.totalOutcomes, 2);
  assert.equal(snapshot.succeeded, 1);
  assert.equal(snapshot.denied, 1);
  assert.equal(snapshot.byWorkstream.H, 1);
  assert.equal(snapshot.byWorkstream.F, 1);
  assert.equal(snapshot.generatedAt, "2026-11-21T12:01:00.000Z");
});

test("retains only the configured bounded number of events", () => {
  const recorder = new FPObservabilityRecorder(2);
  recorder.record(event({ correlationId: "one" }));
  recorder.record(event({ correlationId: "two" }));
  recorder.record(event({ correlationId: "three" }));
  assert.deepEqual(recorder.list().map((item) => item.correlationId), ["two", "three"]);
  assert.equal(recorder.snapshot().retainedEvents, 2);
});

test("rejects invalid event metadata, workstream, outcome and capacities", () => {
  assert.throws(() => new FPObservabilityRecorder(0), RangeError);
  const recorder = new FPObservabilityRecorder();
  assert.throws(() => recorder.record(event({ durationMs: -1 })), TypeError);
  assert.throws(() => recorder.record(event({ correlationId: "bad\\nvalue" })), TypeError);
  assert.throws(() => recorder.record(event({ occurredAt: "not-a-date" })), TypeError);
  assert.throws(() => recorder.record(event({ occurredAt: "2026-02-30T12:00:00.000Z" })), TypeError);
  assert.throws(() => recorder.record(event({ occurredAt: "2026-11-21T12:00:00+08:00" })), TypeError);
  assert.throws(() => recorder.record(event({ errorCode: "sensitive upstream response: token=abc" })), TypeError);
  assert.throws(() => recorder.record(event({ errorCode: "A".repeat(65) })), TypeError);
  assert.throws(() => recorder.record(event({ workstream: "__proto__" })), TypeError);
  assert.throws(() => recorder.record(event({ workstream: "Q" })), TypeError);
  assert.throws(() => recorder.record(event({ outcome: "unexpected" })), TypeError);
});

test("rejects runtime-only fields outside the event allowlist", () => {
  const recorder = new FPObservabilityRecorder();
  assert.throws(() => recorder.record(event({
    actorId: "unapproved-actor-field",
    requestBody: { message: "unapproved-request-field" },
    credential: "unapproved-credential-field",
    arbitraryMetadata: "unapproved-metadata-field",
  }) as never), TypeError);
  assert.equal(recorder.list().length, 0);
});

test("rejects accessors without executing getter code", () => {
  const recorder = new FPObservabilityRecorder();
  let getterCalls = 0;
  const input = event();
  Object.defineProperty(input, "capability", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      throw new Error("getter must not run");
    },
  });

  assert.throws(() => recorder.record(input), TypeError);
  assert.equal(getterCalls, 0);
  assert.equal(recorder.list().length, 0);
});

test("fails closed when hostile proxy reflection traps throw", () => {
  const recorder = new FPObservabilityRecorder();
  const trapFactories: Array<(target: object) => object> = [
    (target) => new Proxy(target, { getPrototypeOf() { throw new Error("prototype trap"); } }),
    (target) => new Proxy(target, { ownKeys() { throw new Error("ownKeys trap"); } }),
    (target) => new Proxy(target, {
      getOwnPropertyDescriptor(_target, key) {
        if (key === "schemaVersion") throw new Error("descriptor trap");
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    }),
  ];

  for (const createProxy of trapFactories) {
    assert.throws(() => recorder.record(createProxy(event()) as never), TypeError);
  }

  const revoked = Proxy.revocable(event(), {});
  revoked.revoke();
  assert.throws(
    () => recorder.record(revoked.proxy as never),
    (error: unknown) => error instanceof TypeError && error.message === "Invalid F–P observability event.",
  );
  assert.equal(recorder.list().length, 0);
});

test("uses descriptor snapshots and never invokes proxy get traps", () => {
  const recorder = new FPObservabilityRecorder();
  let getCalls = 0;
  const input = new Proxy(event(), {
    get(target, key, receiver) {
      getCalls += 1;
      if (key === "outcome") return "failed";
      return Reflect.get(target, key, receiver);
    },
  });

  recorder.record(input);
  assert.equal(getCalls, 0);
  assert.equal(recorder.list()[0].outcome, "succeeded");
});

test("rejects symbols, inherited fields, and non-plain event prototypes", () => {
  const recorder = new FPObservabilityRecorder();
  const symbolEvent = event();
  Object.defineProperty(symbolEvent, Symbol("secret"), { value: "hidden", enumerable: true });
  assert.throws(() => recorder.record(symbolEvent), TypeError);

  const inherited = Object.assign(Object.create({ inherited: "not allowed" }), event());
  assert.throws(() => recorder.record(inherited), TypeError);
  assert.equal(recorder.list().length, 0);
});

test("does not expose mutable internal event storage", () => {
  const recorder = new FPObservabilityRecorder();
  recorder.record(event());
  const returned = recorder.list() as unknown as Array<{ capability: string }>;
  assert.notEqual(returned[0], recorder.list()[0]);
  returned[0].capability = "tampered";
  assert.equal(recorder.list()[0].capability, "health-snapshot");
});
