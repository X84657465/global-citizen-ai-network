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

test("rejects a single oversized NDJSON line before its newline arrives", async () => {
  const body = streamOf(['{"response":"' + "x".repeat(128) ]);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxLineBytes: 64 }),
    /maximum NDJSON line size/,
  );
});

test("rejects oversized complete NDJSON lines before JSON parsing", async () => {
  const body = streamOf(['{"response":"' + "x".repeat(128) + '" ,"done":true}\n']);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxLineBytes: 64 }),
    /maximum NDJSON line size/,
  );
});

test("surfaces Ollama stream-level error payloads as failures", async () => {
  const body = streamOf(['{"error":"model runner crashed"}\n']);
  await assert.rejects(
    collectOllamaGenerateStream(body),
    /model runner crashed/,
  );
});

test("validates the NDJSON line-size limit", async () => {
  const body = streamOf(['{"response":"ok","done":true}\n']);
  await assert.rejects(
    collectOllamaGenerateStream(body, () => {}, { maxLineBytes: 0 }),
    /positive safe integer/,
  );
});

test("rejects malformed UTF-8 even when an invalid sequence spans stream chunks", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([123, 34, 114, 101, 115, 112, 111, 110, 115, 101, 34, 58, 34, 0xc3]));
      controller.enqueue(new Uint8Array([0x28, 34, 44, 34, 100, 111, 110, 101, 34, 58, 116, 114, 117, 101, 125, 10]));
      controller.close();
    },
  });
  await assert.rejects(
    collectOllamaGenerateStream(body),
    /invalid UTF-8/,
  );
});


test("rejects any non-empty NDJSON data after the completion marker", async () => {
  const body = streamOf([
    '{"response":"complete","done":true}\\n',
    '{"response":"late","done":false}\\n',
  ]);
  await assert.rejects(
    collectOllamaGenerateStream(body),
    /data after its completion marker/,
  );
});

test("allows trailing whitespace after the completion marker", async () => {
  const body = streamOf(['{"response":"complete","done":true}\\n  \\n']);
  const result = await collectOllamaGenerateStream(body);
  assert.equal(result.response, "complete");
  assert.equal(result.done, true);
});
