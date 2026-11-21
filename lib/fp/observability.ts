import type { WorkstreamId } from "./integration-contract.ts";

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

/**
 * Bounded, process-local H recorder. It intentionally retains only operational
 * metadata: never pass request payloads, actor references, credentials, or
 * user-generated content to this interface.
 */
export class FPObservabilityRecorder implements FPObservabilitySink {
  private readonly events: FPOperationEvent[] = [];
  private readonly capacity: number;

  constructor(capacity = 250) {
    this.capacity = capacity;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000) {
      throw new RangeError("Observability capacity must be an integer from 1 to 10000.");
    }
  }

  record(event: FPOperationEvent): void {
    if (
      event.schemaVersion !== "1" ||
      event.eventType !== "fp.capability.outcome" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(event.correlationId) ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(event.capability) ||
      !Number.isFinite(event.durationMs) ||
      event.durationMs < 0 ||
      Number.isNaN(Date.parse(event.occurredAt))
    ) {
      throw new TypeError("Invalid F–P observability event.");
    }

    this.events.push(Object.freeze({ ...event }));
    if (this.events.length > this.capacity) this.events.shift();
  }

  list(): readonly FPOperationEvent[] {
    return this.events.slice();
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
