import assert from "node:assert/strict";
import test from "node:test";
import {
  CORRELATION_ID_HEADER,
  createCorrelationContext,
  getOrCreateCorrelationId,
} from "../../lib/observability/request-context.ts";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("reuses a bounded safe incoming correlation ID", () => {
  const headers = new Headers({ [CORRELATION_ID_HEADER]: "edge-req_123:abc.9" });
  assert.equal(getOrCreateCorrelationId(headers), "edge-req_123:abc.9");
});

test("generates a UUID when the correlation ID is absent", () => {
  assert.match(getOrCreateCorrelationId(new Headers()), UUID_V4);
});

test("replaces malformed or oversized correlation IDs", () => {
  for (const value of ["contains spaces", "bad\\nvalue", "x".repeat(129), ""]) {
    const correlationId = getOrCreateCorrelationId(
      new Headers({ [CORRELATION_ID_HEADER]: value }),
    );
    assert.match(correlationId, UUID_V4);
  }
});

test("forwards the same validated ID to route handlers and response headers", () => {
  const incoming = new Headers({
    accept: "application/json",
    "accept-language": "zh-TW",
    [CORRELATION_ID_HEADER]: "edge-req_123:abc.9",
  });
  const context = createCorrelationContext(incoming);

  assert.equal(context.correlationId, "edge-req_123:abc.9");
  assert.equal(context.requestHeaders.get(CORRELATION_ID_HEADER), context.correlationId);
  assert.equal(context.responseHeaders.get(CORRELATION_ID_HEADER), context.correlationId);
  assert.equal(context.requestHeaders.get("accept"), "application/json");
  assert.equal(context.requestHeaders.get("accept-language"), "zh-TW");
  assert.equal(incoming.get(CORRELATION_ID_HEADER), "edge-req_123:abc.9");
});

test("overwrites malformed caller values consistently without mutating the input", () => {
  const incoming = new Headers({ [CORRELATION_ID_HEADER]: "invalid caller value" });
  const context = createCorrelationContext(incoming);

  assert.match(context.correlationId, UUID_V4);
  assert.equal(context.requestHeaders.get(CORRELATION_ID_HEADER), context.correlationId);
  assert.equal(context.responseHeaders.get(CORRELATION_ID_HEADER), context.correlationId);
  assert.equal(incoming.get(CORRELATION_ID_HEADER), "invalid caller value");
});

test("request and response header copies cannot desynchronize each other", () => {
  const context = createCorrelationContext(new Headers());
  context.responseHeaders.set(CORRELATION_ID_HEADER, "mutated-response-id");
  assert.notEqual(
    context.requestHeaders.get(CORRELATION_ID_HEADER),
    context.responseHeaders.get(CORRELATION_ID_HEADER),
  );
});
