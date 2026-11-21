import { FPHostAdapter, type FPHostRequestContext } from "./host-adapter.ts";

export type FPIntegrationEffect = "read" | "write";

export interface FPIntegrationOperationContext {
  /** Resolved secret material is supplied only in memory to the registered adapter. */
  readonly credential: string;
  /** Adapters must stop work when this signal is aborted. */
  readonly signal: AbortSignal;
  readonly correlationId: string;
  /** Required for write operations to support downstream deduplication. */
  readonly idempotencyKey?: string;
}

export interface FPIntegrationOperation {
  readonly name: string;
  readonly effect: FPIntegrationEffect;
  execute(input: unknown, context: FPIntegrationOperationContext): Promise<unknown>;
}

export interface FPIntegrationAdapter {
  readonly id: string;
  readonly version: string;
  readonly operations: readonly FPIntegrationOperation[];
}

export interface FPIntegrationCredentialResolver {
  /** Resolve an opaque reference; never return or log the reference as secret material. */
  resolve(reference: string, signal: AbortSignal): Promise<string>;
}

export type FPIntegrationOutcome = "succeeded" | "failed";

export interface FPIntegrationAuditEvent {
  readonly schemaVersion: "1";
  readonly eventType: "integration.execution";
  readonly connectorId: string;
  readonly connectorVersion: string;
  readonly operation: string;
  readonly outcome: FPIntegrationOutcome;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly durationMs: number;
  readonly errorCode?: string;
}

export interface FPIntegrationAuditSink {
  record(event: FPIntegrationAuditEvent): void;
}

export interface FPIntegrationRequest {
  readonly connectorId: string;
  readonly operation: string;
  readonly credentialRef: string;
  readonly input: unknown;
  readonly idempotencyKey?: string;
}

export interface FPIntegrationExecutionContext {
  readonly correlationId: string;
  readonly now?: Date;
}

export type FPIntegrationErrorCode =
  | "INVALID_REQUEST"
  | "CONNECTOR_NOT_FOUND"
  | "OPERATION_NOT_ALLOWED"
  | "CREDENTIAL_UNAVAILABLE"
  | "IDEMPOTENCY_REQUIRED"
  | "TIMEOUT"
  | "CONNECTOR_FAILURE";

export class FPIntegrationError extends Error {
  constructor(readonly code: FPIntegrationErrorCode, message: string) {
    super(message);
    this.name = "FPIntegrationError";
  }
}

const IDENTIFIER = /^[a-z][a-z0-9-]{1,63}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const CREDENTIAL_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

interface RegisteredConnector {
  readonly adapter: FPIntegrationAdapter;
  readonly operations: ReadonlyMap<string, FPIntegrationOperation>;
}

/** An allowlisted registry. It never discovers providers or accepts caller-supplied URLs. */
export class FPIntegrationRegistry {
  private readonly connectors = new Map<string, RegisteredConnector>();

  register(adapter: FPIntegrationAdapter): void {
    if (
      !adapter ||
      !IDENTIFIER.test(adapter.id) ||
      !VERSION.test(adapter.version) ||
      !Array.isArray(adapter.operations) ||
      adapter.operations.length === 0
    ) {
      throw new TypeError("Invalid integration adapter identity or operation catalogue.");
    }
    if (this.connectors.has(adapter.id)) {
      throw new TypeError("Integration connector is already registered.");
    }

    const operations = new Map<string, FPIntegrationOperation>();
    for (const operation of adapter.operations) {
      if (
        !operation ||
        !IDENTIFIER.test(operation.name) ||
        !["read", "write"].includes(operation.effect) ||
        typeof operation.execute !== "function" ||
        operations.has(operation.name)
      ) {
        throw new TypeError("Invalid or duplicate integration operation.");
      }
      operations.set(operation.name, Object.freeze({
        name: operation.name,
        effect: operation.effect,
        execute: operation.execute.bind(operation),
      }));
    }

    this.connectors.set(adapter.id, Object.freeze({
      adapter: Object.freeze({
        id: adapter.id,
        version: adapter.version,
        operations: Object.freeze([...operations.values()]),
      }),
      operations,
    }));
  }

  hasConnector(connectorId: string): boolean {
    return this.connectors.has(connectorId);
  }

  getAdapter(connectorId: string): FPIntegrationAdapter | undefined {
    return this.connectors.get(connectorId)?.adapter;
  }

  getOperation(connectorId: string, operationName: string): FPIntegrationOperation | undefined {
    return this.connectors.get(connectorId)?.operations.get(operationName);
  }
}

/**
 * Executes only pre-registered connector operations. It has no built-in network
 * client, URL input, retry loop, credential storage, or persistent audit sink.
 * Write operations require a caller-supplied idempotency key; host approval is
 * enforced by FPHostAdapter before this executor is invoked.
 */
export class FPIntegrationExecutor {
  constructor(
    private readonly registry: FPIntegrationRegistry,
    private readonly credentials: FPIntegrationCredentialResolver,
    private readonly audit: FPIntegrationAuditSink,
    private readonly timeoutMs = 15_000,
  ) {
    if (!(registry instanceof FPIntegrationRegistry) ||
        !credentials || typeof credentials.resolve !== "function" ||
        !audit || typeof audit.record !== "function") {
      throw new TypeError("A connector registry, credential resolver, and audit sink are required.");
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 300_000) {
      throw new RangeError("Integration timeout must be between 100 and 300000 milliseconds.");
    }
  }

  register(host: FPHostAdapter): void {
    if (!(host instanceof FPHostAdapter)) {
      throw new TypeError("An existing FPHostAdapter is required.");
    }
    host.register<FPIntegrationRequest, unknown>(
      "I",
      "execute",
      (request, context: FPHostRequestContext) => this.#execute(request, {
        correlationId: context.correlationId,
        now: context.now ? context.now() : new Date(),
      }),
    );
  }

  async #execute(
    request: FPIntegrationRequest,
    context: FPIntegrationExecutionContext,
  ): Promise<unknown> {
    const startedAt = Date.now();
    let adapter: FPIntegrationAdapter | undefined;
    let auditOperation = "invalid";
    let outcome: FPIntegrationOutcome = "failed";
    let errorCode = "INVALID_REQUEST";
    let eventTime = new Date();
    let correlationId = "invalid-context";

    try {
      if (
        !request ||
        typeof request !== "object" ||
        !IDENTIFIER.test(request.connectorId) ||
        !IDENTIFIER.test(request.operation) ||
        typeof request.credentialRef !== "string" ||
        !CREDENTIAL_REFERENCE.test(request.credentialRef) ||
        !context ||
        !CORRELATION_ID.test(context.correlationId)
      ) {
        throw new FPIntegrationError("INVALID_REQUEST", "Invalid integration request.");
      }

      // Snapshot routing and credential metadata before the first asynchronous boundary.
      const safeRequest = Object.freeze({
        connectorId: request.connectorId,
        operation: request.operation,
        credentialRef: request.credentialRef,
        input: request.input,
        ...(request.idempotencyKey !== undefined
          ? { idempotencyKey: request.idempotencyKey }
          : {}),
      });
      auditOperation = safeRequest.operation;
      correlationId = context.correlationId;
      const suppliedTime = context.now ?? new Date();
      if (!(suppliedTime instanceof Date) || Number.isNaN(suppliedTime.getTime())) {
        throw new FPIntegrationError("INVALID_REQUEST", "Invalid integration event time.");
      }
      eventTime = new Date(suppliedTime.getTime());

      adapter = this.registry.getAdapter(safeRequest.connectorId);
      if (!adapter) {
        throw new FPIntegrationError("CONNECTOR_NOT_FOUND", "Connector is not registered.");
      }
      const operation = this.registry.getOperation(safeRequest.connectorId, safeRequest.operation);
      if (!operation) {
        throw new FPIntegrationError("OPERATION_NOT_ALLOWED", "Operation is not registered for this connector.");
      }
      if (
        safeRequest.idempotencyKey !== undefined &&
        (typeof safeRequest.idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(safeRequest.idempotencyKey))
      ) {
        throw new FPIntegrationError("INVALID_REQUEST", "Invalid integration idempotency key.");
      }
      if (operation.effect === "write" && safeRequest.idempotencyKey === undefined) {
        throw new FPIntegrationError("IDEMPOTENCY_REQUIRED", "Write operations require an idempotency key.");
      }

      const controller = new AbortController();
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          reject(new FPIntegrationError("TIMEOUT", "Integration operation exceeded its time limit."));
        }, this.timeoutMs);
      });

      try {
        let credential: string;
        try {
          credential = await Promise.race([
            this.credentials.resolve(safeRequest.credentialRef, controller.signal),
            timeout,
          ]);
        } catch (error) {
          if (error instanceof FPIntegrationError) throw error;
          throw new FPIntegrationError("CREDENTIAL_UNAVAILABLE", "Credential reference could not be resolved.");
        }
        if (typeof credential !== "string" || credential.length === 0) {
          throw new FPIntegrationError("CREDENTIAL_UNAVAILABLE", "Credential resolver returned no credential.");
        }

        const result = await Promise.race([
          operation.execute(safeRequest.input, {
            credential,
            signal: controller.signal,
            correlationId,
            ...(safeRequest.idempotencyKey !== undefined
              ? { idempotencyKey: safeRequest.idempotencyKey }
              : {}),
          }),
          timeout,
        ]);
        outcome = "succeeded";
        errorCode = "";
        return result;
      } catch (error) {
        if (error instanceof FPIntegrationError) throw error;
        throw new FPIntegrationError("CONNECTOR_FAILURE", "Registered connector operation failed.");
      } finally {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      }
    } catch (error) {
      errorCode = error instanceof FPIntegrationError ? error.code : "CONNECTOR_FAILURE";
      throw error;
    } finally {
      if (adapter) {
        try {
          this.audit.record(Object.freeze({
            schemaVersion: "1",
            eventType: "integration.execution",
            connectorId: adapter.id,
            connectorVersion: adapter.version,
            operation: auditOperation,
            outcome,
            correlationId,
            occurredAt: eventTime.toISOString(),
            durationMs: Math.max(0, Date.now() - startedAt),
            ...(errorCode ? { errorCode } : {}),
          }));
        } catch {
          // Audit sink failure must not change connector execution behavior.
        }
      }
    }
  }
}

/** Registers I on the shared host; there is no public direct-execution method. */
export function registerFPIntegrationCapability(input: {
  readonly host: FPHostAdapter;
  readonly executor: FPIntegrationExecutor;
}): void {
  if (!input || !(input.host instanceof FPHostAdapter) || !(input.executor instanceof FPIntegrationExecutor)) {
    throw new TypeError("An existing FPHostAdapter and FPIntegrationExecutor are required.");
  }
  input.executor.register(input.host);
}
