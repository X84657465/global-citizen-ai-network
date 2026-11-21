import assert from "node:assert/strict";
import test from "node:test";
import { FPHostAdapter, FPHostError } from "../../lib/fp/host-adapter.ts";
import {
  FPIntegrationError,
  FPIntegrationExecutor,
  FPIntegrationRegistry,
  registerFPIntegrationCapability,
  type FPIntegrationAuditEvent,
  type FPIntegrationRequest,
} from "../../lib/fp/integration-registry.ts";

const context = (approved = true) => ({
  principal: {
    actorRef: "host-user:123",
    resourceRef: "workspace:456",
    authorized: true,
    approved,
  },
  correlationId: "request-123",
  now: () => new Date("2026-11-22T12:00:00.000Z"),
});

function fixture(operation: {
  name?: string;
  effect?: "read" | "write";
  execute?: (input: unknown, context: { credential: string; signal: AbortSignal; correlationId: string; idempotencyKey?: string }) => Promise<unknown>;
} = {}) {
  const registry = new FPIntegrationRegistry();
  const auditEvents: FPIntegrationAuditEvent[] = [];
  const calls: unknown[] = [];
  registry.register({
    id: "sample-api",
    version: "1.2.0",
    operations: [{
      name: operation.name ?? "get-record",
      effect: operation.effect ?? "read",
      async execute(input, ctx) {
        calls.push({ input, credential: ctx.credential, correlationId: ctx.correlationId, idempotencyKey: ctx.idempotencyKey });
        return operation.execute ? operation.execute(input, ctx) : { ok: true };
      },
    }],
  });
  const executor = new FPIntegrationExecutor(
    registry,
    { async resolve(reference) {
      assert.equal(reference, "vault-record-1");
      return "secret-value-never-audit";
    } },
    { record(event) { auditEvents.push(event); } },
    500,
  );
  const host = new FPHostAdapter();
  registerFPIntegrationCapability({ host, executor });
  return { host, executor, auditEvents, calls, registry };
}

const request: FPIntegrationRequest = {
  connectorId: "sample-api",
  operation: "get-record",
  credentialRef: "vault-record-1",
  input: { recordId: "record-7" },
};

test("registers I on the existing host and executes a pre-registered read operation", async () => {
  const f = fixture();
  const result = await f.host.invoke(
    { workstream: "I", capability: "execute", input: request },
    context(true),
  );

  assert.deepEqual(result.envelope.payload, { ok: true });
  assert.equal(result.envelope.workstream, "I");
  assert.equal(result.envelope.correlationId, "request-123");
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0] && (f.calls[0] as { credential: string }).credential, "secret-value-never-audit");
  assert.equal(f.auditEvents.length, 1);
  assert.equal(f.auditEvents[0].outcome, "succeeded");
  assert.equal(f.auditEvents[0].correlationId, "request-123");
  assert.equal(JSON.stringify(f.auditEvents).includes("secret-value-never-audit"), false);
  assert.equal(JSON.stringify(f.auditEvents).includes("record-7"), false);
});

test("host denial and missing explicit approval prevent credential resolution and connector execution", async () => {
  const f = fixture();
  await assert.rejects(
    f.host.invoke({ workstream: "I", capability: "execute", input: request }, context(false)),
    (error: unknown) => error instanceof FPHostError && error.code === "APPROVAL_REQUIRED",
  );
  assert.equal(f.calls.length, 0);
  await assert.rejects(
    f.host.invoke(
      { workstream: "I", capability: "execute", input: request },
      { ...context(true), principal: { ...context(true).principal, authorized: false } },
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "UNAUTHORIZED",
  );
  assert.equal(f.calls.length, 0);
});

test("requires idempotency keys for write operations", async () => {
  const f = fixture({ effect: "write" });
  await assert.rejects(
    f.host.invoke({ workstream: "I", capability: "execute", input: request }, context(true)),
    (error: unknown) => error instanceof FPIntegrationError && error.code === "IDEMPOTENCY_REQUIRED",
  );
  assert.equal(f.calls.length, 0);
  await f.host.invoke(
    {
      workstream: "I",
      capability: "execute",
      input: { ...request, idempotencyKey: "sync-record-7" },
    },
    context(true),
  );
  assert.equal(f.calls.length, 1);
});

test("rejects unknown connectors, unregistered operations and unsafe credential references", async () => {
  const f = fixture();
  await assert.rejects(
    f.host.invoke(
      { workstream: "I", capability: "execute", input: { ...request, connectorId: "unknown-api" } },
      context(true),
    ),
    (error: unknown) => error instanceof FPIntegrationError && error.code === "CONNECTOR_NOT_FOUND",
  );
  await assert.rejects(
    f.host.invoke(
      { workstream: "I", capability: "execute", input: { ...request, operation: "delete-all" } },
      context(true),
    ),
    (error: unknown) => error instanceof FPIntegrationError && error.code === "OPERATION_NOT_ALLOWED",
  );
  await assert.rejects(
    f.host.invoke(
      { workstream: "I", capability: "execute", input: { ...request, credentialRef: "../secret" } },
      context(true),
    ),
    (error: unknown) => error instanceof FPIntegrationError && error.code === "INVALID_REQUEST",
  );
  assert.equal(f.calls.length, 0);
});

test("requires unique safe connector and operation registrations", () => {
  const registry = new FPIntegrationRegistry();
  const adapter = {
    id: "sample-api",
    version: "1.0.0",
    operations: [{ name: "read-record", effect: "read" as const, async execute() { return null; } }],
  };
  registry.register(adapter);
  assert.throws(() => registry.register(adapter), TypeError);
  assert.throws(() => registry.register({
    ...adapter,
    id: "other-api",
    operations: [
      { name: "read-record", effect: "read" as const, async execute() { return null; } },
      { name: "read-record", effect: "read" as const, async execute() { return null; } },
    ],
  }), TypeError);
  assert.throws(() => registry.register({ ...adapter, id: "../api" }), TypeError);
});

test("aborts timed-out connector work and records a sanitized timeout", async () => {
  const registry = new FPIntegrationRegistry();
  const auditEvents: FPIntegrationAuditEvent[] = [];
  let signal: AbortSignal | undefined;
  registry.register({
    id: "slow-api",
    version: "1.0.0",
    operations: [{
      name: "read-record",
      effect: "read",
      execute(_input, context) {
        signal = context.signal;
        return new Promise((_resolve, reject) => {
          context.signal.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
        });
      },
    }],
  });
  const executor = new FPIntegrationExecutor(
    registry,
    { async resolve() { return "secret"; } },
    { record(event) { auditEvents.push(event); } },
    100,
  );
  const host = new FPHostAdapter();
  registerFPIntegrationCapability({ host, executor });

  await assert.rejects(
    host.invoke(
      {
        workstream: "I",
        capability: "execute",
        input: { connectorId: "slow-api", operation: "read-record", credentialRef: "vault-record-1", input: null },
      },
      context(true),
    ),
    (error: unknown) => error instanceof FPIntegrationError && error.code === "TIMEOUT",
  );
  assert.equal(signal?.aborted, true);
  assert.equal(auditEvents[0].errorCode, "TIMEOUT");
  assert.equal(JSON.stringify(auditEvents).includes("cancelled"), false);
});

test("sanitizes connector exceptions and does not leak credential or input data to audit", async () => {
  const f = fixture({
    execute: async () => { throw new Error("secret-value-never-audit payload=private"); },
  });
  await assert.rejects(
    f.host.invoke({ workstream: "I", capability: "execute", input: request }, context(true)),
    (error: unknown) => error instanceof FPIntegrationError && error.code === "CONNECTOR_FAILURE",
  );
  assert.equal(f.auditEvents[0].errorCode, "CONNECTOR_FAILURE");
  assert.equal(JSON.stringify(f.auditEvents).includes("secret-value-never-audit"), false);
  assert.equal(JSON.stringify(f.auditEvents).includes("private"), false);
});

test("audit sink failures do not change the connector result", async () => {
  const registry = new FPIntegrationRegistry();
  registry.register({
    id: "sample-api",
    version: "1.0.0",
    operations: [{ name: "read-record", effect: "read", async execute() { return "ok"; } }],
  });
  const executor = new FPIntegrationExecutor(
    registry,
    { async resolve() { return "secret"; } },
    { record() { throw new Error("sink unavailable"); } },
  );
  const host = new FPHostAdapter();
  registerFPIntegrationCapability({ host, executor });
  const result = await host.invoke(
    {
      workstream: "I",
      capability: "execute",
      input: { connectorId: "sample-api", operation: "read-record", credentialRef: "vault-record-1", input: null },
    },
    context(true),
  );
  assert.equal(result.envelope.payload, "ok");
});

test("keeps registered adapter and operation catalogues immutable", () => {
  const f = fixture();
  const adapter = f.registry.getAdapter("sample-api");
  const operation = f.registry.getOperation("sample-api", "get-record");
  assert.ok(adapter);
  assert.ok(operation);
  assert.equal(Object.isFrozen(adapter), true);
  assert.equal(Object.isFrozen(adapter.operations), true);
  assert.equal(Object.isFrozen(operation), true);
});
