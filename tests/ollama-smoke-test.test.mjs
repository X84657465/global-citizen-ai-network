import test from "node:test";
import assert from "node:assert/strict";
import { runOllamaSmokeTest } from "../lib/ollama-smoke-test.mjs";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

test("selects the smallest installed model and validates a real structured generation", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/api/tags")) {
      return response({ models: [{ name: "large", size: 900 }, { name: "small", size: 100 }] });
    }
    return response({
      done: true,
      response: '{"status":"ok"}',
      eval_count: 4,
      prompt_eval_count: 8,
      total_duration: 123,
    });
  };
  const result = await runOllamaSmokeTest({ fetchImpl });
  assert.equal(result.model, "small");
  assert.equal(result.eval_count, 4);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "POST");
  const request = JSON.parse(calls[1].options.body);
  assert.equal(request.model, "small");
  assert.equal(request.stream, false);
  assert.equal(request.options.num_predict, 32);
});

test("fails when no Ollama model is installed", async () => {
  await assert.rejects(
    runOllamaSmokeTest({ fetchImpl: async () => response({ models: [] }) }),
    /No local Ollama model/,
  );
});

test("fails on HTTP errors from the Ollama generation endpoint", async () => {
  let calls = 0;
  await assert.rejects(
    runOllamaSmokeTest({
      fetchImpl: async () => (++calls === 1
        ? response({ models: [{ name: "small", size: 1 }] })
        : response({}, 500)),
    }),
    /generation returned HTTP 500/,
  );
});

test("fails closed when generated output is malformed or violates the schema", async () => {
  for (const generated of ["not-json", '{"status":"not-ok"}', '{"status":"ok","extra":true}']) {
    let calls = 0;
    await assert.rejects(
      runOllamaSmokeTest({
        fetchImpl: async () => (++calls === 1
          ? response({ models: [{ name: "small", size: 1 }] })
          : response({ done: true, response: generated })),
      }),
      /valid JSON|strict JSON response schema/,
    );
  }
});

test("rejects incomplete generation and invalid timeout configuration", async () => {
  let calls = 0;
  await assert.rejects(
    runOllamaSmokeTest({
      fetchImpl: async () => (++calls === 1
        ? response({ models: [{ name: "small", size: 1 }] })
        : response({ done: false, response: '{"status":"ok"}' })),
    }),
    /did not complete/,
  );
  await assert.rejects(
    runOllamaSmokeTest({ fetchImpl: async () => response({ models: [] }), timeoutMs: 1 }),
    /between 10000 and 600000/,
  );
});
