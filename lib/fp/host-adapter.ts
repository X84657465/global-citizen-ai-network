import {
  getWorkstreamContract,
  type FPCapabilityEnvelope,
  type WorkstreamId,
} from "./integration-contract.ts";
import type { FPObservabilitySink } from "./observability.ts";

export interface FPHostPrincipal {
  /** Opaque identity reference issued by the existing host. */
  readonly actorRef: string;
  /** Opaque resource reference issued by the existing host. */
  readonly resourceRef?: string;
  /** Trusted host decision; never derive this from an event payload. */
  readonly authorized: boolean;
  /** Explicit host approval for capabilities with bounded side effects. */
  readonly approved: boolean;
}

export interface FPHostRequestContext {
  readonly principal: FPHostPrincipal;
  readonly correlationId: string;
  readonly now?: () => Date;
}

export interface FPCapabilityRequest<TInput = unknown> {
  readonly workstream: WorkstreamId;
  readonly capability: string;
  readonly input: TInput;
  readonly idempotencyKey?: string;
}

export interface FPCapabilityResult<TOutput = unknown> {
  readonly envelope: FPCapabilityEnvelope<TOutput>;
}

export type FPCapabilityHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: FPHostRequestContext,
) => Promise<TOutput> | TOutput;

export type FPHostErrorCode =
  | "INVALID_CONTEXT"
  | "UNKNOWN_CAPABILITY"
  | "UNAUTHORIZED"
  | "APPROVAL_REQUIRED"
  | "EXECUTION_DISABLED";

export class FPHostError extends Error {
  constructor(
    readonly code: FPHostErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FPHostError";
  }
}

function assertSafeReference(value: string | undefined, label: string): void {
  if (typeof value !== "string" || value.length === 0 || value.length > 256 || /[\r\n\0]/.test(value)) {
    throw new FPHostError("INVALID_CONTEXT", `Invalid host ${label}.`);
  }
}

function assertCorrelationId(value: string): void {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new FPHostError("INVALID_CONTEXT", "Invalid correlation ID.");
  }
}

/**
 * Host adapter for attaching F–P capability handlers to the existing platform.
 *
 * The caller must supply principal and authorization/approval decisions from
 * the trusted host. No identity lookup, permission inference, persistence,
 * queue, or side-effect mechanism is implemented here.
 */
export class FPHostAdapter {
  private readonly handlers = new Map<string, FPCapabilityHandler>();

  constructor(private readonly observability?: FPObservabilitySink) {}

  private recordOutcome(
    request: FPCapabilityRequest,
    context: FPHostRequestContext,
    outcome: "succeeded" | "denied" | "rejected" | "failed",
    startedAt: number,
    errorCode?: string,
  ): void {
    if (!this.observability) return;
    const correlationId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(context.correlationId)
      ? context.correlationId
      : "invalid-context";
    try {
      this.observability.record({
        schemaVersion: "1",
        eventType: "fp.capability.outcome",
        workstream: request.workstream,
        capability: request.capability,
        correlationId,
        outcome,
        occurredAt: new Date().toISOString(),
        durationMs: Math.max(0, Date.now() - startedAt),
        ...(errorCode ? { errorCode } : {}),
      });
    } catch {
      // Observability is best-effort and must never change capability behavior.
    }
  }

  register<TInput, TOutput>(
    workstream: WorkstreamId,
    capability: string,
    handler: FPCapabilityHandler<TInput, TOutput>,
  ): void {
    try {
      getWorkstreamContract(workstream);
    } catch {
      throw new FPHostError("UNKNOWN_CAPABILITY", "Unknown F–P workstream.");
    }
    if (typeof capability !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(capability)) {
      throw new FPHostError("UNKNOWN_CAPABILITY", "Invalid capability name.");
    }
    if (typeof handler !== "function") {
      throw new FPHostError("UNKNOWN_CAPABILITY", "Capability handler must be a function.");
    }
    const key = `${workstream}:${capability}`;
    if (this.handlers.has(key)) {
      throw new FPHostError("UNKNOWN_CAPABILITY", `Capability already registered: ${key}`);
    }
    this.handlers.set(key, handler as FPCapabilityHandler);
  }

  async invoke<TInput = unknown, TOutput = unknown>(
    request: FPCapabilityRequest<TInput>,
    context: FPHostRequestContext,
  ): Promise<FPCapabilityResult<TOutput>> {
    if (!request || typeof request !== "object" || !context || typeof context !== "object" ||
        !context.principal || typeof context.principal !== "object") {
      throw new FPHostError("INVALID_CONTEXT", "Host request and principal context are required.");
    }
    let contract;
    try {
      contract = getWorkstreamContract(request.workstream);
    } catch {
      throw new FPHostError("UNKNOWN_CAPABILITY", "Unknown F–P workstream.");
    }
    if (typeof request.capability !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(request.capability)) {
      throw new FPHostError("UNKNOWN_CAPABILITY", "Invalid capability name.");
    }
    if (typeof context.principal.authorized !== "boolean" ||
        typeof context.principal.approved !== "boolean") {
      throw new FPHostError("INVALID_CONTEXT", "Host authorization and approval decisions must be booleans.");
    }
    const key = `${request.workstream}:${request.capability}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new FPHostError("UNKNOWN_CAPABILITY", `No handler registered for ${key}.`);
    }

    assertSafeReference(context.principal.actorRef, "actor reference");
    if (context.principal.resourceRef !== undefined) {
      assertSafeReference(context.principal.resourceRef, "resource reference");
    }
    assertCorrelationId(context.correlationId);

    if (context.principal.authorized !== true) {
      throw new FPHostError("UNAUTHORIZED", "The existing host did not authorize this request.");
    }
    if (contract.executionAuthority === "none") {
      throw new FPHostError("EXECUTION_DISABLED", "This workstream is registered as non-executable.");
    }
    if (contract.executionAuthority === "bounded" && context.principal.approved !== true) {
      throw new FPHostError("APPROVAL_REQUIRED", "Explicit host approval is required.");
    }

    if (
      request.idempotencyKey !== undefined &&
      (typeof request.idempotencyKey !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(request.idempotencyKey))
    ) {
      throw new FPHostError("INVALID_CONTEXT", "Invalid idempotency key.");
    }

    if (context.now !== undefined && typeof context.now !== "function") {
      throw new FPHostError("INVALID_CONTEXT", "Host clock must be a function.");
    }
    const now = (context.now ?? (() => new Date()))();
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new FPHostError("INVALID_CONTEXT", "Host clock returned an invalid date.");
    }

    const output = await handler(request.input, context);
    const envelope: FPCapabilityEnvelope<TOutput> = Object.freeze({
      contractVersion: "1",
      workstream: request.workstream,
      capability: request.capability,
      eventId: globalThis.crypto.randomUUID(),
      occurredAt: now.toISOString(),
      correlationId: context.correlationId,
      actorRef: context.principal.actorRef,
      ...(context.principal.resourceRef
        ? { resourceRef: context.principal.resourceRef }
        : {}),
      ...(request.idempotencyKey
        ? { idempotencyKey: request.idempotencyKey }
        : {}),
      payload: output,
    });

    return { envelope };
  }
}
