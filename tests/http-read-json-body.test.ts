import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../lib/http/read-json-body.ts";

function post(body: BodyInit | null, headers?: HeadersInit) {
  return new Request("https://example.test/api", {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

test("parses valid JSON within the byte limit", async () => {
  assert.deepEqual(await readJsonBody(post(JSON.stringify({ message: "hello" })), 128), {
    ok: true,
    value: { message: "hello" },
  });
});

test("rejects malformed, fractional, negative, and unsafe Content-Length values", async () => {
  for (const contentLength of ["abc", "1.5", "-1", "9007199254740992"]) {
    assert.deepEqual(
      await readJsonBody(post("{}", { "content-length": contentLength }), 128),
      { ok: false, status: 400 },
    );
  }
});

test("rejects a declared body larger than the configured limit before reading", async () => {
  assert.deepEqual(
    await readJsonBody(post("{}", { "content-length": "129" }), 128),
    { ok: false, status: 413 },
  );
});

test("enforces the byte limit on streamed bodies even without Content-Length", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"payload":"'));
      controller.enqueue(new TextEncoder().encode("x".repeat(64)));
      controller.close();
    },
  });
  assert.deepEqual(
    await readJsonBody(post(body), 16),
    { ok: false, status: 413 },
  );
});

test("rejects invalid UTF-8 and malformed JSON", async () => {
  assert.deepEqual(
    await readJsonBody(post(new Uint8Array([0xc3, 0x28])), 128),
    { ok: false, status: 400 },
  );
  assert.deepEqual(
    await readJsonBody(post("{not-json"), 128),
    { ok: false, status: 400 },
  );
});

test("rejects an absent request body", async () => {
  const request = new Request("https://example.test/api", { method: "POST" });
  assert.deepEqual(await readJsonBody(request, 128), { ok: false, status: 400 });
});
