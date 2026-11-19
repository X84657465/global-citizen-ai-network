import test from "node:test";
import assert from "node:assert/strict";
import { ReadableStream } from "node:stream/web";
import { collectOllamaGenerateStream } from "../lib/ollama-generate-stream.mjs";

function streamOf(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

test("collects a fragmented NDJSON response and reports progress", async () => {
  const progress = [];
  const body = streamOf([
    '{"response":"hel',
    'lo","done":false}\n{"response":" world","done":true,"done_reason":"stop","eval_count":3}\n',
  ]);
  const result = await collectOllamaGenerateStream(body, (value) => progress.push(value));
  assert.equal(result.response, "hello world");
  assert.equal(result.done_reason, "stop");
  assert.equal(progress.at(-1).done, true);
  assert.equal(progress.at(-1).response_characters, 11);
});

test("rejects streamed output above the byte limit before accumulating the full response", async () => {
  const body = streamOf([
    '{"response":"1234","done":false}\n',
    '{"response":"5678","done":true}\n',
  ]);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxResponseBytes: 6 }),
    /maximum response size/,
  );
});

test("counts UTF-8 bytes rather than JavaScript characters for output limits", async () => {
  const body = streamOf(['{"response":"你好","done":true}\n']);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxResponseBytes: 5 }),
    /maximum response size/,
  );
});

test("rejects excessive NDJSON chunks", async () => {
  const body = streamOf([
    '{"response":"a","done":false}\n',
    '{"response":"b","done":true}\n',
  ]);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxChunks: 1 }),
    /maximum chunk count/,
  );
});

test("rejects malformed NDJSON and streams without a completion marker", async () => {
  await assert.rejects(
    collectOllamaGenerateStream(streamOf(["not-json\n"])),
    /invalid NDJSON/,
  );
  await assert.rejects(
    collectOllamaGenerateStream(streamOf(['{"response":"partial","done":false}\n'])),
    /without a completion marker/,
  );
});

test("validates stream collection limits", async () => {
  const body = streamOf(['{"response":"ok","done":true}\n']);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxResponseBytes: 0 }),
    /positive safe integer/,
  );
});
