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
  recorder.record(event());
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

test("rejects invalid event metadata and invalid capacities", () => {
  assert.throws(() => new FPObservabilityRecorder(0), RangeError);
  const recorder = new FPObservabilityRecorder();
  assert.throws(() => recorder.record(event({ durationMs: -1 })), TypeError);
  assert.throws(() => recorder.record(event({ correlationId: "bad\\nvalue" })), TypeError);
  assert.throws(() => recorder.record(event({ occurredAt: "not-a-date" })), TypeError);
});

test("does not expose mutable internal event storage", () => {
  const recorder = new FPObservabilityRecorder();
  recorder.record(event());
  const returned = recorder.list()[0] as unknown as { capability: string };
  assert.notEqual(returned, recorder.list()[0]);
  returned.capability = "tampered";
  assert.equal(recorder.list()[0].capability, "health-snapshot");
});
