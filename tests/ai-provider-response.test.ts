import test from "node:test";
import assert from "node:assert/strict";
import {
  isKnownProviderRejection,
  parseProviderResponse,
  ProviderResponseError,
  readProviderJson,
} from "../lib/ai/provider-response.ts";

test("reads a valid bounded provider JSON response", async () => {
  const response = new Response(JSON.stringify({ choices: [] }), {
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await readProviderJson(response), { choices: [] });
});

test("rejects a declared provider response larger than the configured limit", async () => {
  const response = new Response('{"ok":true}', {
    headers: { "content-length": "1000" },
  });
  await assert.rejects(
    readProviderJson(response, 32),
    (error) => error instanceof ProviderResponseError && error.code === "response_too_large",
  );
});

test("rejects a streamed provider response after it crosses the byte limit", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"payload":"too large"}'));
      controller.close();
    },
  });
  const response = new Response(body);
  await assert.rejects(
    readProviderJson(response, 8),
    (error) => error instanceof ProviderResponseError && error.code === "response_too_large",
  );
});

test("classifies a provider body stream failure as an uncertain read outcome", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{"));
      controller.error(new Error("upstream stream interrupted"));
    },
  });
  const response = new Response(body);
  await assert.rejects(
    readProviderJson(response),
    (error) => error instanceof ProviderResponseError && error.code === "provider_body_read_failed",
  );
});

test("rejects malformed JSON instead of treating it as an empty response", async () => {
  const response = new Response("{not-json");
  await assert.rejects(
    readProviderJson(response),
    (error) => error instanceof ProviderResponseError && error.code === "invalid_provider_json",
  );
});

test("validates OpenAI-compatible content and provider token usage", () => {
  const parsed = parseProviderResponse({
    id: "provider-request-123",
    choices: [{ message: { content: "  Hello citizen  " } }],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 7,
      prompt_tokens_details: { cached_tokens: 3 },
    },
  }, 100);

  assert.deepEqual(parsed, {
    answer: "Hello citizen",
    inputTokens: 12,
    outputTokens: 7,
    cachedTokens: 3,
    providerRequestId: "provider-request-123",
    usageSource: "provider",
  });
});

test("supports text-part content arrays and partial usage fallback", () => {
  const parsed = parseProviderResponse({
    choices: [{ message: { content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] } }],
    usage: { prompt_tokens: 9 },
  }, 100);

  assert.equal(parsed.answer, "Hello world");
  assert.equal(parsed.inputTokens, 9);
  assert.equal(parsed.outputTokens, "Hello world".length);
  assert.equal(parsed.usageSource, "provider_partial_with_fallback");
});

test("uses conservative character fallback when provider usage is absent", () => {
  const parsed = parseProviderResponse({
    choices: [{ message: { content: "A response" } }],
  }, 37);

  assert.equal(parsed.inputTokens, 37);
  assert.equal(parsed.outputTokens, "A response".length);
  assert.equal(parsed.usageSource, "conservative_character_fallback");
});

test("rejects negative, fractional, excessive, and inconsistent token counts", () => {
  const cases = [
    { prompt_tokens: -1, completion_tokens: 1 },
    { prompt_tokens: 1.5, completion_tokens: 1 },
    { prompt_tokens: 1, completion_tokens: 1000001 },
    { prompt_tokens: 0, completion_tokens: 1 },
    { prompt_tokens: 1, completion_tokens: 0 },
    { prompt_tokens: 2, completion_tokens: 1, prompt_tokens_details: { cached_tokens: 3 } },
  ];

  for (const usage of cases) {
    assert.throws(
      () => parseProviderResponse({
        choices: [{ message: { content: "response" } }],
        usage,
      }, 10),
      ProviderResponseError,
    );
  }
});

test("rejects malformed provider choices and non-text content parts", () => {
  assert.throws(
    () => parseProviderResponse({ choices: [{ message: { content: 123 } }] }, 10),
    ProviderResponseError,
  );
  assert.throws(
    () => parseProviderResponse({ choices: [{ message: { content: [{ type: "image", text: "x" }] } }] }, 10),
    ProviderResponseError,
  );
});

test("only explicit validation and authentication failures are known provider rejections", () => {
  for (const status of [400, 401, 403, 404, 422]) {
    assert.equal(isKnownProviderRejection(status), true, `HTTP ${status} should be treated as an explicit rejection`);
  }
  for (const status of [408, 409, 425, 429, 500, 502, 503, 504]) {
    assert.equal(isKnownProviderRejection(status), false, `HTTP ${status} must retain the reservation for reconciliation`);
  }
});


test("rejects invalid content-length headers and empty provider bodies", async () => {
  for (const contentLength of ["-1", "not-a-number", "1.5"]) {
    const response = new Response("{}", { headers: { "content-length": contentLength } });
    await assert.rejects(
      readProviderJson(response),
      (error) => error instanceof ProviderResponseError && error.code === "invalid_content_length",
    );
  }

  await assert.rejects(
    readProviderJson(new Response(null)),
    (error) => error instanceof ProviderResponseError && error.code === "empty_provider_body",
  );
});

test("rejects invalid UTF-8 instead of silently replacing provider bytes", async () => {
  const response = new Response(new Uint8Array([0xc3, 0x28]));
  await assert.rejects(
    readProviderJson(response),
    (error) => error instanceof ProviderResponseError && error.code === "invalid_provider_json",
  );
});

test("rejects missing choices, empty answers, and oversized provider request IDs", () => {
  assert.throws(
    () => parseProviderResponse({ choices: [] }, 1),
    (error) => error instanceof ProviderResponseError && error.code === "invalid_provider_choices",
  );
  assert.throws(
    () => parseProviderResponse({ choices: [{ message: { content: "   " } }] }, 1),
    (error) => error instanceof ProviderResponseError && error.code === "invalid_provider_answer_length",
  );
  assert.throws(
    () => parseProviderResponse({
      id: "x".repeat(257),
      choices: [{ message: { content: "answer" } }],
    }, 1),
    (error) => error instanceof ProviderResponseError && error.code === "invalid_provider_request_id",
  );
});

test("rejects malformed usage objects and cached token values", () => {
  const invalidUsage: unknown[] = [
    "usage",
    { prompt_tokens: "3", completion_tokens: 1 },
    { prompt_tokens: 3, completion_tokens: 1, prompt_tokens_details: [] },
    { prompt_tokens: 3, completion_tokens: 1, prompt_tokens_details: { cached_tokens: -1 } },
  ];

  for (const usage of invalidUsage) {
    assert.throws(
      () => parseProviderResponse({
        choices: [{ message: { content: "answer" } }],
        usage,
      }, 10),
      ProviderResponseError,
    );
  }
});


test("cancels provider bodies rejected by invalid or oversized declared content-length", async () => {
  for (const [contentLength, expectedCode] of [
    ["-1", "invalid_content_length"],
    ["not-a-number", "invalid_content_length"],
    ["1000", "response_too_large"],
  ] as const) {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
      },
      cancel() {
        canceled = true;
      },
    });
    const response = new Response(body, {
      headers: { "content-length": contentLength },
    });

    await assert.rejects(
      readProviderJson(response, 32),
      (error) => error instanceof ProviderResponseError && error.code === expectedCode,
    );
    assert.equal(canceled, true, `body should be canceled for Content-Length ${contentLength}`);
  }
});
