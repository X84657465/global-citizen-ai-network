import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createOllamaOfmBridge } from "../scripts/ollama-ofm-bridge.mjs";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return "http://127.0.0.1:" + server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function fixture(t) {
  const upstream = http.createServer(async (request, response) => {
    if (request.headers.authorization !== "Bearer test-api-key-123456789") {
      response.writeHead(401).end();
      return;
    }
    if (request.url === "/v1/models") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "kilo-auto/free" }] }));
      return;
    }
    if (request.url === "/v1/chat/completions") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const input = JSON.parse(body);
      if (input.stream) {
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write("data: " + JSON.stringify({ choices: [{ delta: { content: "{\\"schema_version\\":1}" }, finish_reason: null }] }) + "\r\n\r\n");
        response.end("data: [DONE]\r\n\r\n");
      } else {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
          choices: [{ message: { content: "{\\"schema_version\\":1}" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 12, completion_tokens: 5 },
        }));
      }
      return;
    }
    response.writeHead(404).end();
  });

  const upstreamUrl = await listen(upstream);
  const bridge = createOllamaOfmBridge({
    baseUrl: upstreamUrl + "/v1",
    apiKey: "test-api-key-123456789",
    model: "kilo-auto/free",
    port: 0,
  });
  const bridgeUrl = await listen(bridge);
  t.after(async () => {
    await close(bridge);
    await close(upstream);
  });
  return bridgeUrl;
}

test("exposes only the configured Kilo model through Ollama tags", async (t) => {
  const url = await fixture(t);
  const response = await fetch(url + "/api/tags");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.models.map((model) => model.name), ["kilo-auto/free"]);
});

test("translates non-streaming Ollama generation into OpenAI chat completions", async (t) => {
  const url = await fixture(t);
  const response = await fetch(url + "/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "kilo-auto/free",
      system: "Return JSON only.",
      prompt: "Generate a JSON object.",
      stream: false,
      options: { num_predict: 1024 },
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.response, "{\\"schema_version\\":1}");
  assert.equal(payload.done, true);
  assert.equal(payload.prompt_eval_count, 12);
  assert.equal(payload.eval_count, 5);
});

test("translates CRLF OpenAI SSE into Ollama NDJSON chunks", async (t) => {
  const url = await fixture(t);
  const response = await fetch(url + "/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "kilo-auto/free",
      prompt: "Generate a JSON object.",
      stream: true,
      options: { num_predict: 1024 },
    }),
  });
  assert.equal(response.status, 200);
  const lines = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(lines[0].response, "{\\"schema_version\\":1}");
  assert.equal(lines.at(-1).done, true);
  assert.equal(lines.at(-1).done_reason, "stop");
});

test("refuses non-Kilo models and non-loopback upstreams", () => {
  assert.throws(() => createOllamaOfmBridge({
    apiKey: "test-api-key-123456789",
    model: "opencode/some-model",
  }), /Kilo channel/);
  assert.throws(() => createOllamaOfmBridge({
    apiKey: "test-api-key-123456789",
    model: "kilo-auto/free",
    baseUrl: "https://example.com/v1",
  }), /local loopback/);
});
