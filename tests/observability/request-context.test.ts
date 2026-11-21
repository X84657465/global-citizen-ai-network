import assert from "node:assert/strict";
import test from "node:test";
import {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "../../lib/observability/request-context.ts";

test("reuses a bounded safe incoming correlation ID", () => {
  const headers = new Headers({ [CORRELATION_ID_HEADER]: "edge-req_123:abc.9" });
  assert.equal(getOrCreateCorrelationId(headers), "edge-req_123:abc.9");
});

test("generates a UUID when the correlation ID is absent", () => {
  const correlationId = getOrCreateCorrelationId(new Headers());
  assert.match(correlationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("replaces malformed or oversized correlation IDs", () => {
  for (const value of ["contains spaces", "bad\\nvalue", "x".repeat(129), ""]) {
    const correlationId = getOrCreateCorrelationId(
      new Headers({ [CORRELATION_ID_HEADER]: value }),
    );
    assert.match(correlationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }
});
