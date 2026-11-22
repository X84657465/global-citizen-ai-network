/**
 * H — privacy-minimized observability and cost/quota evidence.
 *
 * This pure evaluator accepts bounded, pre-aggregated operational events.
 * It does not collect telemetry, identify members, read secrets, charge users,
 * enforce quotas, or mutate runner/workflow state.
 */

export const H_EVENT_KINDS = ["queue", "runner", "task", "cost"] as const;
export type HEventKind = (typeof H_EVENT_KINDS)[number];
export type HEventOutcome = "success" | "failure" | "cancelled" | "timeout" | "deferred";

export interface HTelemetryEvent {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly kind: HEventKind;
  readonly outcome: HEventOutcome;
  readonly durationMs?: number;
  /** Integer micro-units in the declared currency; never floating-point money. */
  readonly costMicros?: number;
  readonly currency?: "USD" | "TWD" | "EUR";
}

export interface HObservationBundle {
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly quotaLimitMicros: number;
  readonly quotaWarningPercent: number;
  readonly events: readonly HTelemetryEvent[];
}

export interface HObservationAssessment {
  readonly schemaVersion: "1";
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly eventCount: number;
  readonly counts: Readonly<Record<HEventKind, number>>;
  readonly outcomes: Readonly<Record<HEventOutcome, number>>;
  readonly durationSampleCount: number;
  readonly durationP50Ms: number | null;
  readonly durationP95Ms: number | null;
  readonly costMicros: number;
  readonly currency: "USD" | "TWD" | "EUR" | null;
  readonly quotaLimitMicros: number;
  readonly quotaUsagePercent: number;
  readonly quotaStatus: "within-budget" | "warning" | "exceeded";
  /** Completeness cannot be established from caller-supplied events alone. */
  readonly evidenceCompleteness: "not-verifiable";
  readonly enforcementAuthorized: false;
}

const EVENT_ID = /^[A-Za-z0-9_-]{8,80}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OUTCOMES = ["success", "failure", "cancelled", "timeout", "deferred"] as const;
const CURRENCIES = ["USD", "TWD", "EUR"] as const;
const MAX_EVENTS = 20_000;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_COST_MICROS = Number.MAX_SAFE_INTEGER;

function isCanonicalUtc(value: string): boolean {
  return ISO_UTC.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function positiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isSafeRecord(value: object, allowed: readonly string[], required: readonly string[]): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;

  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || !allowed.includes(key))) return false;
  if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) return false;

  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && descriptor.enumerable && "value" in descriptor;
  });
}

/**
 * Copies a dense, plain event array using own data descriptors only.
 * Rejects custom iterators, subclasses, sparse slots, accessors and extra keys
 * so iteration cannot diverge from the validated length or execute getters.
 */
function snapshotSafeEventArray(value: unknown): unknown[] | null {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype ||
      value.length > MAX_EVENTS
    ) {
      return null;
    }

    const keys = Reflect.ownKeys(value);
    if (keys.length !== value.length + 1) return null;

    const snapshot: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      snapshot[index] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
}

/**
 * Validates a closed reporting window and returns deterministic operational
 * summaries. Cost events must use one currency; absent costs remain zero and
 * no estimated value is promoted to an actual charge.
 */
export function assessHObservation(bundle: HObservationBundle): HObservationAssessment {
  if (
    !bundle ||
    !isSafeRecord(bundle, ["windowStart", "windowEnd", "quotaLimitMicros", "quotaWarningPercent", "events"], ["windowStart", "windowEnd", "quotaLimitMicros", "quotaWarningPercent", "events"]) ||
    !isCanonicalUtc(bundle.windowStart) ||
    !isCanonicalUtc(bundle.windowEnd) ||
    Date.parse(bundle.windowStart) >= Date.parse(bundle.windowEnd) ||
    !positiveSafeInteger(bundle.quotaLimitMicros) ||
    !Number.isFinite(bundle.quotaWarningPercent) ||
    bundle.quotaWarningPercent <= 0 ||
    bundle.quotaWarningPercent >= 100 ||
  ) {
    throw new TypeError("Invalid H observation window or quota policy.");
  }

  const events = snapshotSafeEventArray(bundle.events);
  if (events === null) {
    throw new TypeError("Invalid H event collection; expected a bounded dense plain array.");
  }

  const ids = new Set<string>();
  const counts: Record<HEventKind, number> = { queue: 0, runner: 0, task: 0, cost: 0 };
  const outcomes: Record<HEventOutcome, number> = {
    success: 0, failure: 0, cancelled: 0, timeout: 0, deferred: 0,
  };
  const durations: number[] = [];
  let costMicros = 0;
  let currency: HObservationAssessment["currency"] = null;

  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {\n    const event = events[eventIndex] as HTelemetryEvent;
    if (
      !event ||
      !isSafeRecord(event, ["eventId", "occurredAt", "kind", "outcome", "durationMs", "costMicros", "currency"], ["eventId", "occurredAt", "kind", "outcome"]) ||
      typeof event.eventId !== "string" ||
      !EVENT_ID.test(event.eventId) ||
      ids.has(event.eventId) ||
      !isCanonicalUtc(event.occurredAt) ||
      Date.parse(event.occurredAt) < Date.parse(bundle.windowStart) ||
      Date.parse(event.occurredAt) >= Date.parse(bundle.windowEnd) ||
      !(H_EVENT_KINDS as readonly string[]).includes(event.kind) ||
      !(OUTCOMES as readonly string[]).includes(event.outcome)
    ) {
      throw new TypeError("Invalid, duplicate, or out-of-window H telemetry event.");
    }
    ids.add(event.eventId);
    counts[event.kind] += 1;
    outcomes[event.outcome] += 1;

    if (event.durationMs !== undefined) {
      if (!Number.isSafeInteger(event.durationMs) || event.durationMs < 0 ||
          event.durationMs > MAX_DURATION_MS) {
        throw new TypeError("H event duration must be a bounded non-negative integer.");
      }
      durations.push(event.durationMs);
    }

    if (event.kind === "cost") {
      if (
        event.costMicros === undefined ||
        !nonNegativeSafeInteger(event.costMicros) ||
        !(CURRENCIES as readonly string[]).includes(event.currency ?? "")
      ) {
        throw new TypeError("H cost events require non-negative safe integer micro-units and an explicit supported currency.");
      }
      if (currency !== null && currency !== event.currency) {
        throw new TypeError("H cost events with mixed currencies cannot be aggregated.");
      }
      currency = event.currency!;
      costMicros += event.costMicros;
      if (!Number.isSafeInteger(costMicros) || costMicros > MAX_COST_MICROS) {
        throw new TypeError("H aggregate cost exceeds safe integer precision.");
      }
    } else if (event.costMicros !== undefined || event.currency !== undefined) {
      throw new TypeError("H cost fields are only permitted on cost events.");
    }
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const quotaUsagePercent = costMicros / bundle.quotaLimitMicros * 100;
  const quotaStatus = costMicros >= bundle.quotaLimitMicros
    ? "exceeded"
    : quotaUsagePercent >= bundle.quotaWarningPercent
      ? "warning"
      : "within-budget";

  return Object.freeze({
    schemaVersion: "1",
    windowStart: bundle.windowStart,
    windowEnd: bundle.windowEnd,
    eventCount: events.length,
    counts: Object.freeze(counts),
    outcomes: Object.freeze(outcomes),
    durationSampleCount: sorted.length,
    durationP50Ms: percentile(sorted, 0.5),
    durationP95Ms: percentile(sorted, 0.95),
    costMicros,
    currency,
    quotaLimitMicros: bundle.quotaLimitMicros,
    quotaUsagePercent,
    quotaStatus,
    evidenceCompleteness: "not-verifiable",
    enforcementAuthorized: false,
  });
}
