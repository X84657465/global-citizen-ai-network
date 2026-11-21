import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware.ts";
import { CORRELATION_ID_HEADER } from "../../lib/observability/request-context.ts";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function withoutSupabaseConfiguration<T>(run: () => Promise<T>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    return await run();
  } finally {
    if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
  }
}

test("middleware forwards the same validated correlation ID to the route and response", async () => {
  await withoutSupabaseConfiguration(async () => {
    const incomingId = "edge-req_123:abc.9";
    const request = new NextRequest("https://gcan.test/api/health", {
      headers: new Headers({ [CORRELATION_ID_HEADER]: incomingId }),
    });
    const response = await middleware(request);

    assert.equal(response.headers.get(CORRELATION_ID_HEADER), incomingId);
    assert.equal(
      response.headers.get(`x-middleware-request-${CORRELATION_ID_HEADER}`),
      incomingId,
    );
    assert.ok(
      response.headers.get("x-middleware-override-headers")
        ?.split(",")
        .includes(CORRELATION_ID_HEADER),
    );
    assert.equal(request.headers.get(CORRELATION_ID_HEADER), incomingId);
  });
});

test("middleware replaces malformed correlation IDs consistently at the request edge", async () => {
  await withoutSupabaseConfiguration(async () => {
    const malformedId = "invalid caller value";
    const request = new NextRequest("https://gcan.test/api/health", {
      headers: new Headers({ [CORRELATION_ID_HEADER]: malformedId }),
    });
    const response = await middleware(request);
    const responseId = response.headers.get(CORRELATION_ID_HEADER);

    assert.ok(responseId && UUID_V4.test(responseId));
    assert.equal(
      response.headers.get(`x-middleware-request-${CORRELATION_ID_HEADER}`),
      responseId,
    );
    assert.ok(
      response.headers.get("x-middleware-override-headers")
        ?.split(",")
        .includes(CORRELATION_ID_HEADER),
    );
    assert.equal(request.headers.get(CORRELATION_ID_HEADER), malformedId);
  });
});
