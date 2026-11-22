import assert from "node:assert/strict";
import test from "node:test";
import { assessHObservation, type HObservationBundle, type HTelemetryEvent } from "../../lib/fp/observability-assurance.ts";

const start = "2026-11-22T00:00:00.000Z";
const end = "2026-11-23T00:00:00.000Z";
const event = (eventId: string, overrides: Partial<HTelemetryEvent> = {}): HTelemetryEvent => ({
  eventId,
  occurredAt: "2026-11-22T12:00:00.000Z",
  kind: "task",
  outcome: "success",
  ...overrides,
});
const bundle = (events: readonly HTelemetryEvent[], overrides: Partial<HObservationBundle> = {}): HObservationBundle => ({
  windowStart: start,
  windowEnd: end,
  quotaLimitMicros: 1_000_000,
  quotaWarningPercent: 80,
  events,
  ...overrides,
});

test("summarizes bounded queue, runner, task and cost telemetry deterministically", () => {
  const result = assessHObservation(bundle([
    event("event-0001", { kind: "queue", outcome: "deferred", durationMs: 10 }),
    event("event-0002", { kind: "runner", outcome: "success", durationMs: 20 }),
    event("event-0003", { kind: "task", outcome: "failure", durationMs: 30 }),
    event("event-0004", { kind: "cost", costMicros: 820_000, currency: "USD" }),
  ]));
  assert.equal(result.eventCount, 4);
  assert.equal(result.counts.queue, 1);
  assert.equal(result.counts.runner, 1);
  assert.equal(result.counts.task, 1);
  assert.equal(result.counts.cost, 1);
  assert.equal(result.outcomes.failure, 1);
  assert.equal(result.durationP50Ms, 20);
  assert.equal(result.durationP95Ms, 30);
  assert.equal(result.costMicros, 820_000);
  assert.equal(result.currency, "USD");
  assert.equal(result.quotaStatus, "warning");
  assert.equal(result.enforcementAuthorized, false);
  assert.equal(result.evidenceCompleteness, "not-verifiable");
});

test("marks quota exceeded without mutating or enforcing quota", () => {
  const result = assessHObservation(bundle([
    event("cost-0001", { kind: "cost", costMicros: 1_000_000, currency: "TWD" }),
  ]));
  assert.equal(result.quotaStatus, "exceeded");
  assert.equal(result.quotaUsagePercent, 100);
  assert.equal(result.enforcementAuthorized, false);
});

test("accepts empty windows and reports missing duration/cost as unknown or zero", () => {
  const result = assessHObservation(bundle([]));
  assert.equal(result.eventCount, 0);
  assert.equal(result.durationP50Ms, null);
  assert.equal(result.durationP95Ms, null);
  assert.equal(result.currency, null);
  assert.equal(result.costMicros, 0);
});

test("rejects duplicate identifiers and events outside the reporting window", () => {
  assert.throws(() => assessHObservation(bundle([
    event("duplicate-1"), event("duplicate-1"),
  ])), /duplicate/);
  assert.throws(() => assessHObservation(bundle([
    event("outside-1", { occurredAt: end }),
  ])), /out-of-window/);
});

test("rejects mixed currencies, fractional costs and invalid durations", () => {
  assert.throws(() => assessHObservation(bundle([
    event("cost-usd-1", { kind: "cost", costMicros: 1, currency: "USD" }),
    event("cost-twd-1", { kind: "cost", costMicros: 1, currency: "TWD" }),
  ])), /mixed currencies/);
  assert.throws(() => assessHObservation(bundle([
    event("cost-frac-1", { kind: "cost", costMicros: 1.5, currency: "USD" }),
  ])), /safe integer/);
  assert.throws(() => assessHObservation(bundle([
    event("duration-frac", { durationMs: 1.5 }),
  ])), /duration/);
});


test("requires cost evidence to be explicit and keeps cost fields off non-cost events", () => {
  assert.throws(() => assessHObservation(bundle([
    event("cost-missing", { kind: "cost", currency: "USD" }),
  ])), /require non-negative safe integer/);
  assert.throws(() => assessHObservation(bundle([
    event("task-cost", { kind: "task", costMicros: 10, currency: "USD" }),
  ])), /only permitted on cost events/);
  const zeroCost = assessHObservation(bundle([
    event("cost-zero", { kind: "cost", costMicros: 0, currency: "USD" }),
  ]));
  assert.equal(zeroCost.costMicros, 0);
  assert.equal(zeroCost.currency, "USD");
});

test("rejects malformed timestamps, unsafe quota settings and excessive event batches", () => {
  assert.throws(() => assessHObservation(bundle([], { windowStart: "yesterday" })), TypeError);
  assert.throws(() => assessHObservation(bundle([], { quotaWarningPercent: 100 })), TypeError);
  assert.throws(() => assessHObservation(bundle([], { quotaLimitMicros: 0 })), TypeError);
  assert.throws(() => assessHObservation(bundle(Array.from({ length: 20_001 }, (_, i) => event(`event-${i.toString().padStart(6, "0")}`)))), TypeError);
});


test("rejects undeclared event payloads and bundle metadata", () => {
  const eventWithSensitivePayload = {
    ...event("extra-payload-01"),
    memberId: "member-123",
    prompt: "private prompt",
  } as HTelemetryEvent;
  assert.throws(() => assessHObservation(bundle([eventWithSensitivePayload])), /Invalid, duplicate, or out-of-window/);

  const bundleWithExtraMetadata = {
    ...bundle([]),
    tracePayload: "must not enter the evaluator",
  } as HObservationBundle;
  assert.throws(() => assessHObservation(bundleWithExtraMetadata), /Invalid H observation window/);
});

test("uses a half-open UTC window and rejects malformed event identity or taxonomy", () => {
  const atStart = assessHObservation(bundle([
    event("boundary-0001", { occurredAt: start }),
  ]));
  assert.equal(atStart.eventCount, 1);
  assert.throws(() => assessHObservation(bundle([
    event("short"),
  ])), /Invalid, duplicate, or out-of-window/);
  assert.throws(() => assessHObservation(bundle([
    event("invalid-kind", { kind: "member" as HTelemetryEvent["kind"] }),
  ])), /Invalid, duplicate, or out-of-window/);
  assert.throws(() => assessHObservation(bundle([
    event("invalid-outcome", { outcome: "unknown" as HTelemetryEvent["outcome"] }),
  ])), /Invalid, duplicate, or out-of-window/);
});

test("rejects aggregate cost overflow and duration values beyond the documented bound", () => {
  assert.throws(() => assessHObservation(bundle([
    event("cost-max-001", { kind: "cost", costMicros: Number.MAX_SAFE_INTEGER, currency: "USD" }),
    event("cost-over-001", { kind: "cost", costMicros: 1, currency: "USD" }),
  ])), /aggregate cost exceeds safe integer precision/);
  assert.throws(() => assessHObservation(bundle([
    event("duration-over", { durationMs: 7 * 24 * 60 * 60 * 1000 + 1 }),
  ])), /duration/);
});
