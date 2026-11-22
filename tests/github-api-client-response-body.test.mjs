import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubApiClient, GitHubApiError } from "../lib/github-api-client.mjs";

const response = (status, text, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: "status " + status,
  headers: { get: (key) => headers[key.toLowerCase()] ?? null },
  text,
});

test("retries a safe read when the response body stream fails transiently", async () => {
  let calls = 0;
  const delays = [];
  const client = createGitHubApiClient({
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? response(200, async () => { throw new Error("stream reset"); })
        : response(200, async () => JSON.stringify({ ok: true }));
    },
    sleep: async (ms) => delays.push(ms),
  });

  assert.deepEqual(await client.request("/repos/example/repo"), { ok: true });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [500]);
});

test("does not retry a non-idempotent write when its response body stream fails", async () => {
  let calls = 0;
  const client = createGitHubApiClient({
    fetchImpl: async () => {
      calls += 1;
      return response(201, async () => { throw new Error("stream reset"); });
    },
    sleep: async () => {},
  });

  await assert.rejects(
    client.request("/repos/example/repo/issues", { method: "POST", body: { title: "once" } }),
    (error) => error instanceof GitHubApiError &&
      error.status === 201 &&
      error.method === "POST" &&
      error.path === "/repos/example/repo/issues",
  );
  assert.equal(calls, 1);
});

test("preserves long rate-limit deadlines when a 429 body cannot be read", async () => {
  let calls = 0;
  const client = createGitHubApiClient({
    now: () => 1_000_000,
    maxInlineRetryDelayMs: 30_000,
    fetchImpl: async () => {
      calls += 1;
      return response(429, async () => { throw new Error("stream reset"); }, {
        "retry-after": "300",
      });
    },
    sleep: async () => {},
  });

  await assert.rejects(
    client.request("/rate_limit"),
    (error) => error instanceof GitHubApiError &&
      error.status === 429 &&
      error.rateLimited === true &&
      error.retryAfterMs === 300_000,
  );
  assert.equal(calls, 1);
});
