import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubApiClient, GitHubApiError } from "../lib/github-api-client.mjs";

const response = (status, body = {}, headers = {}) => ({
  ok: status >= 200 && status < 300, status, statusText: "status " + status,
  headers: { get: (key) => headers[key.toLowerCase()] ?? null },
  text: async () => body === null ? "" : typeof body === "string" ? body : JSON.stringify(body),
});

test("retries GET on 5xx with bounded exponential delay", async () => {
  const calls = []; const delays = [];
  const sequence = [response(503, { message: "upstream" }), response(200, { ok: true })];
  const client = createGitHubApiClient({ token: "test", fetchImpl: async () => { calls.push(1); return sequence.shift(); }, sleep: async (ms) => delays.push(ms) });
  assert.deepEqual(await client.request("/repos/example/repo"), { ok: true });
  assert.equal(calls.length, 2); assert.deepEqual(delays, [500]);
});

test("never blindly retries POST after an ambiguous server response", async () => {
  let calls = 0;
  const client = createGitHubApiClient({ fetchImpl: async () => { calls += 1; return response(502, { message: "gateway" }); }, sleep: async () => {} });
  await assert.rejects(client.request("/repos/example/repo/pulls", { method: "POST", body: { title: "draft" } }), GitHubApiError);
  assert.equal(calls, 1);
});

test("honors Retry-After for rate-limited safe requests", async () => {
  const delays = []; let calls = 0;
  const client = createGitHubApiClient({ now: () => 1_000_000, fetchImpl: async () => { calls += 1; return calls === 1 ? response(429, { message: "rate limit" }, { "retry-after": "2" }) : response(200, { ok: true }); }, sleep: async (ms) => delays.push(ms) });
  assert.deepEqual(await client.request("/rate_limit"), { ok: true });
  assert.deepEqual(delays, [2000]);
});

test("does not retry permission errors", async () => {
  let calls = 0;
  const client = createGitHubApiClient({ fetchImpl: async () => { calls += 1; return response(403, { message: "Resource not accessible by integration" }); }, sleep: async () => {} });
  await assert.rejects(client.request("/repos/example/repo/issues"), (error) => error.status === 403 && error.rateLimited === false);
  assert.equal(calls, 1);
});

test("honors the rate-limit reset header for secondary rate limits", async () => {
  const delays = []; let calls = 0;
  const client = createGitHubApiClient({ now: () => 1_000_000, fetchImpl: async () => { calls += 1; return calls === 1 ? response(403, { message: "You have exceeded a secondary rate limit." }, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1002" }) : response(200, { ok: true }); }, sleep: async (ms) => delays.push(ms) });
  assert.deepEqual(await client.request("/repos/example/repo/issues"), { ok: true });
  assert.deepEqual(delays, [2000]);
});

test("does not retry 404 or 422 validation errors", async () => {
  for (const status of [404, 422]) {
    let calls = 0;
    const client = createGitHubApiClient({ fetchImpl: async () => { calls += 1; return response(status, { message: "permanent" }); }, sleep: async () => {} });
    await assert.rejects(client.request("/repos/example/repo/issues"), (error) => error.status === status);
    assert.equal(calls, 1);
  }
});

test("rejects invalid JSON success responses without retry", async () => {
  let calls = 0;
  const client = createGitHubApiClient({ fetchImpl: async () => { calls += 1; return response(200, "not-json"); }, sleep: async () => {} });
  await assert.rejects(client.request("/repos/example/repo"), /invalid JSON/);
  assert.equal(calls, 1);
});