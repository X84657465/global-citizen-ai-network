import { isFPWorkstream, type WorkstreamId } from "./integration-contract.ts";

export type FPOperationOutcome = "succeeded" | "denied" | "rejected" | "failed";

export interface FPOperationEvent {
  readonly schemaVersion: "1";
  readonly eventType: "fp.capability.outcome";
  readonly workstream: WorkstreamId;
  readonly capability: string;
  readonly correlationId: string;
  readonly outcome: FPOperationOutcome;
  readonly occurredAt: string;
  readonly durationMs: number;
  readonly errorCode?: string;
}

export interface FPHealthSnapshot {
  readonly schemaVersion: "1";
  readonly generatedAt: string;
  readonly retainedEvents: number;
  readonly totalOutcomes: number;
  readonly succeeded: number;
  readonly denied: number;
  readonly rejected: number;
  readonly failed: number;
  readonly byWorkstream: Readonly<Record<WorkstreamId, number>>;
  readonly lastEventAt?: string;
}

export interface FPObservabilitySink {
  record(event: FPOperationEvent): void;
}

const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_:-]{0,63}$/;
const EVENT_KEYS = [
  "schemaVersion",
  "eventType",
  "workstream",
  "capability",
  "correlationId",
  "outcome",
  "occurredAt",
  "durationMs",
  "errorCode",
] as const;
const REQUIRED_EVENT_KEYS = EVENT_KEYS.filter((key) => key !== "errorCode");

/**
 * Copies a caller-supplied event without invoking getters or proxy get traps.
 * The returned null-prototype record contains only own enumerable data
 * properties from the event allowlist. Any reflection failure is rejected.
 */
function snapshotOperationEvent(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || !EVENT_KEYS.includes(key as typeof EVENT_KEYS[number]))) {
      return null;
    }

    const keySet = new Set(keys as string[]);
    if (REQUIRED_EVENT_KEYS.some((key) => !keySet.has(key))) return null;

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Bounded, process-local H recorder. It intentionally retains only operational
 * metadata: never pass request payloads, actor references, credentials, or
 * user-generated content to this interface.
 */
export class FPObservabilityRecorder implements FPObservabilitySink {
  private readonly events: FPOperationEvent[] = [];
  private readonly capacity: number;

  constructor(capacity = 250) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000) {
      throw new RangeError("Observability capacity must be an integer from 1 to 10000.");
    }
    this.capacity = capacity;
  }

  record(event: FPOperationEvent): void {
    const input = snapshotOperationEvent(event);
    const validTimestamp = typeof input?.occurredAt === "string" &&
      UTC_TIMESTAMP.test(input.occurredAt) &&
      !Number.isNaN(Date.parse(input.occurredAt)) &&
      new Date(input.occurredAt).toISOString() === input.occurredAt;
    const validErrorCode = input?.errorCode === undefined ||
      (typeof input.errorCode === "string" && SAFE_ERROR_CODE.test(input.errorCode));

    if (
      !input ||
      input.schemaVersion !== "1" ||
      input.eventType !== "fp.capability.outcome" ||
      typeof input.workstream !== "string" ||
      !isFPWorkstream(input.workstream) ||
      typeof input.outcome !== "string" ||
      !["succeeded", "denied", "rejected", "failed"].includes(input.outcome) ||
      typeof input.correlationId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.correlationId) ||
      typeof input.capability !== "string" ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(input.capability) ||
      typeof input.durationMs !== "number" ||
      !Number.isFinite(input.durationMs) ||
      input.durationMs < 0 ||
      !validTimestamp ||
      !validErrorCode
    ) {
      throw new TypeError("Invalid F–P observability event.");
    }

    // Rebuild only from the validated immutable snapshot. Never read from the
    // caller-controlled object again after reflection and descriptor checks.
    const safeEvent: FPOperationEvent = {
      schemaVersion: "1",
      eventType: "fp.capability.outcome",
      workstream: input.workstream as WorkstreamId,
      capability: input.capability,
      correlationId: input.correlationId,
      outcome: input.outcome as FPOperationOutcome,
      occurredAt: input.occurredAt as string,
      durationMs: input.durationMs as number,
      ...(input.errorCode === undefined ? {} : { errorCode: input.errorCode as string }),
    };
    this.events.push(Object.freeze(safeEvent));
    if (this.events.length > this.capacity) this.events.shift();
  }

  list(): readonly FPOperationEvent[] {
    // Return detached records so callers can inspect or mutate their copies
    // without exposing the recorder's immutable retained events.
    return this.events.map((event) => ({ ...event }));
  }

  snapshot(now: Date = new Date()): FPHealthSnapshot {
    if (Number.isNaN(now.getTime())) throw new TypeError("Invalid snapshot time.");
    const byWorkstream: Record<WorkstreamId, number> = {
      F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0, N: 0, O: 0, P: 0,
    };
    const counts = { succeeded: 0, denied: 0, rejected: 0, failed: 0 };
    for (const event of this.events) {
      counts[event.outcome] += 1;
      byWorkstream[event.workstream] += 1;
    }
    return Object.freeze({
      schemaVersion: "1",
      generatedAt: now.toISOString(),
      retainedEvents: this.events.length,
      totalOutcomes: this.events.length,
      ...counts,
      byWorkstream: Object.freeze(byWorkstream),
      ...(this.events.length ? { lastEventAt: this.events[this.events.length - 1].occurredAt } : {}),
    });
  }
}
