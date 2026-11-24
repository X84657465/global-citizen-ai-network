import http from "node:http";

const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_OUTPUT_TOKENS = 32768;

function isLoopback(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BYTES) {
        reject(new Error("request_too_large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", () => reject(new Error("request_read_failed")));
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function parseModelList(value, model) {
  const entries = Array.isArray(value?.data) ? value.data : [];
  return entries.some((entry) => entry && entry.id === model);
}

async function readJsonResponse(response) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("invalid_upstream_json");
  }
}

async function streamChatCompletion(upstream, downstream, controller) {
  if (!upstream.body) throw new Error("empty_upstream_stream");
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let totalBytes = 0;
  let finishReason = "stop";
  let usage = {};
  let doneMarker = false;

  const sendChunk = (chunk) => {
    const choice = Array.isArray(chunk?.choices) ? chunk.choices[0] : null;
    const delta = choice?.delta;
    if (typeof delta?.content === "string" && delta.content.length > 0) {
      totalBytes += Buffer.byteLength(delta.content, "utf8");
      if (totalBytes > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
      downstream.write(JSON.stringify({ response: delta.content, done: false }) + "\n");
    }
    if (typeof choice?.finish_reason === "string") finishReason = choice.finish_reason;
    if (chunk?.usage && typeof chunk.usage === "object") usage = chunk.usage;
  };

  const consumeFrame = (frame) => {
    const data = frame.split("\n")
      .map((line) => line.replace(/\r$/, ""))
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    if (data === "[DONE]") {
      doneMarker = true;
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error("invalid_upstream_stream_event");
    }
    sendChunk(parsed);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        consumeFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (Buffer.byteLength(buffer, "utf8") > 65536) throw new Error("upstream_event_too_large");
    }
    buffer += decoder.decode();
    if (buffer.trim()) consumeFrame(buffer);
    if (!doneMarker) throw new Error("upstream_stream_incomplete");
    downstream.write(JSON.stringify({
      done: true,
      done_reason: finishReason,
      prompt_eval_count: Number.isSafeInteger(usage.prompt_tokens) ? usage.prompt_tokens : undefined,
      eval_count: Number.isSafeInteger(usage.completion_tokens) ? usage.completion_tokens : undefined,
    }) + "\n");
    downstream.end();
  } catch (error) {
    controller.abort();
    downstream.write(JSON.stringify({ error: error instanceof Error ? error.message : "upstream_stream_failed" }) + "\n");
    downstream.end();
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

export function createOllamaOfmBridge(options = {}) {
  const baseUrl = String(options.baseUrl ?? process.env.OFM_BASE_URL ?? "http://127.0.0.1:18900/v1").replace(/\/+$/, "");
  const apiKey = options.apiKey ?? process.env.OFM_API_KEY;
  const model = options.model ?? process.env.OFM_MODEL ?? "kilo-auto/free";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 900000;
  const port = options.port ?? Number(process.env.OFM_BRIDGE_PORT ?? 11435);
  const host = options.host ?? "127.0.0.1";

  let parsedBase;
  try { parsedBase = new URL(baseUrl); } catch { throw new TypeError("OFM_BASE_URL must be a valid URL."); }
  if (!["http:", "https:"].includes(parsedBase.protocol) || !isLoopback(parsedBase.hostname)) {
    throw new TypeError("OFM_BASE_URL must point to a local loopback service.");
  }
  if (!parsedBase.pathname.endsWith("/v1")) throw new TypeError("OFM_BASE_URL must end in /v1.");
  if (typeof apiKey !== "string" || apiKey.trim().length < 16) throw new TypeError("OFM_API_KEY is required.");
  if (typeof model !== "string" || !(/^(kilo-|kilo\/)/i).test(model)) {
    throw new TypeError("OFM_MODEL must identify a Kilo channel model; OpenCode free-lane models are not enabled.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10000 || timeoutMs > 1800000) {
    throw new TypeError("timeoutMs must be between 10000 and 1800000.");
  }
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new TypeError("port must be between 0 and 65535.");
  if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") {
    throw new TypeError("The bridge may only listen on loopback.");
  }

  const upstreamHeaders = {
    authorization: "Bearer " + apiKey,
    "content-type": "application/json",
  };

  const server = http.createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && path === "/api/tags") {
      try {
        const upstream = await fetchImpl(baseUrl + "/models", {
          headers: upstreamHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (!upstream.ok) return sendJson(response, 503, { error: "free_model_service_unavailable" });
        const list = await readJsonResponse(upstream);
        if (!parseModelList(list, model)) return sendJson(response, 503, { error: "configured_kilo_model_unavailable" });
        return sendJson(response, 200, { models: [{ name: model, model, size: 1 }] });
      } catch {
        return sendJson(response, 503, { error: "free_model_service_unavailable" });
      }
    }

    if (request.method !== "POST" || path !== "/api/generate") {
      return sendJson(response, 404, { error: "not_found" });
    }

    let input;
    try { input = await readRequestJson(request); } catch (error) {
      return sendJson(response, error.message === "request_too_large" ? 413 : 400, { error: error.message });
    }
    if (!input || input.model !== model || typeof input.prompt !== "string" || input.prompt.length === 0) {
      return sendJson(response, 400, { error: "invalid_generation_request" });
    }
    const outputTokens = Number(input.options?.num_predict ?? 4096);
    if (!Number.isSafeInteger(outputTokens) || outputTokens < 1 || outputTokens > MAX_OUTPUT_TOKENS) {
      return sendJson(response, 400, { error: "invalid_output_token_budget" });
    }

    const controller = new AbortController();
    response.on("close", () => {
      if (!response.writableEnded) controller.abort();
    });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const upstream = await fetchImpl(baseUrl + "/chat/completions", {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify({
          model,
          messages: [
            ...(typeof input.system === "string" ? [{ role: "system", content: input.system }] : []),
            { role: "user", content: input.prompt },
          ],
          temperature: 0,
          max_tokens: outputTokens,
          stream: input.stream === true,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      if (!upstream.ok) {
        if (!response.headersSent) return sendJson(response, 502, { error: "free_model_upstream_rejected_request", status: upstream.status });
        response.end();
        return;
      }
      if (input.stream === true) {
        response.writeHead(200, {
          "content-type": "application/x-ndjson; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        });
        await streamChatCompletion(upstream, response, controller);
        return;
      }
      const payload = await readJsonResponse(upstream);
      const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
      const answer = choice?.message?.content;
      if (typeof answer !== "string" || answer.length === 0) {
        return sendJson(response, 502, { error: "free_model_returned_empty_content" });
      }
      return sendJson(response, 200, {
        response: answer,
        done: true,
        done_reason: choice.finish_reason ?? "stop",
        prompt_eval_count: Number.isSafeInteger(payload.usage?.prompt_tokens) ? payload.usage.prompt_tokens : undefined,
        eval_count: Number.isSafeInteger(payload.usage?.completion_tokens) ? payload.usage.completion_tokens : undefined,
      });
    } catch {
      if (!response.headersSent) sendJson(response, 502, { error: "free_model_request_failed" });
      else if (!response.writableEnded) response.end();
    } finally {
      clearTimeout(timer);
    }
  });

  return server;
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const server = createOllamaOfmBridge();
  const port = Number(process.env.OFM_BRIDGE_PORT ?? 11435);
  server.listen(port, "127.0.0.1", () => {
    console.log("Factory Kilo free-model bridge listening on http://127.0.0.1:" + server.address().port);
    console.log("Set OLLAMA_BASE_URL to this loopback URL. API credentials are not logged.");
  });
}
