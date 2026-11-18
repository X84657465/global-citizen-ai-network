import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../lib/http/read-json-body.ts";

const url = "https://example.test/api";

test("parses a valid bounded JSON request", async () => {
  const request = new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "member@example.test" }),
  });
  const result = await readJsonBody(request, 128);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, { email: "member@example.test" });
});

test("rejects malformed JSON with HTTP 400", async () => {
  const request = new Request(url, { method: "POST", body: "{invalid" });
  assert.deepEqual(await readJsonBody(request, 128), { ok: false, status: 400 });
});

test("rejects a declared body length above the limit before reading", async () => {
  const request = new Request(url, {
    method: "POST",
    headers: { "Content-Length": "4097" },
    body: "{}",
  });
  assert.deepEqual(await readJsonBody(request, 4096), { ok: false, status: 413 });
});

test("rejects a streamed body above the limit even without content-length", async () => {
  const request = new Request(url, { method: "POST", body: "123456789" });
  assert.deepEqual(await readJsonBody(request, 4), { ok: false, status: 413 });
});

test("rejects invalid UTF-8 instead of accepting replacement characters", async () => {
  const request = new Request(url, {
    method: "POST",
    body: new Uint8Array([0xff, 0xfe]),
  });
  assert.deepEqual(await readJsonBody(request, 16), { ok: false, status: 400 });
});

test("rejects a missing request body", async () => {
  const request = new Request(url, { method: "POST" });
  assert.deepEqual(await readJsonBody(request, 16), { ok: false, status: 400 });
});

test("rejects an invalid content-length header", async () => {
  const request = new Request(url, {
    method: "POST",
    headers: { "Content-Length": "invalid" },
    body: "{}",
  });
  assert.deepEqual(await readJsonBody(request, 16), { ok: false, status: 400 });
});
