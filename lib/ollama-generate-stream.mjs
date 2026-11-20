export async function collectOllamaGenerateStream(body, onChunk = () => {}, options = {}) {
  if (!body || typeof body.getReader !== "function") {
    throw new TypeError("Ollama response body is not a readable stream.");
  }
  const maxResponseBytes = options.maxResponseBytes ?? 256 * 1024;
  const maxChunks = options.maxChunks ?? 100_000;
  const maxLineBytes = options.maxLineBytes ?? 1024 * 1024;
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) {
    throw new TypeError("maxResponseBytes must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(maxChunks) || maxChunks < 1) {
    throw new TypeError("maxChunks must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1) {
    throw new TypeError("maxLineBytes must be a positive safe integer.");
  }

  const reader = body.getReader();
  // Fatal decoding prevents malformed provider bytes from being silently
  // replaced with U+FFFD and then accepted as valid model output.
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let generatedResponse = "";
  let generatedResponseBytes = 0;
  let finalChunk = null;
  let chunkCount = 0;

  const decode = (bytes, stream) => {
    try {
      return decoder.decode(bytes, { stream });
    } catch {
      throw new Error("Ollama stream contains invalid UTF-8.");
    }
  };

  const consumeLine = (line) => {
    if (Buffer.byteLength(line, "utf8") > maxLineBytes) {
      throw new Error("Ollama stream exceeded the maximum NDJSON line size.");
    }
    const value = line.trim();
    if (!value) return;
    if (finalChunk) {
      throw new Error("Ollama stream returned data after its completion marker.");
    }
    let chunk;
    try {
      chunk = JSON.parse(value);
    } catch {
      throw new Error("Ollama returned an invalid NDJSON stream chunk.");
    }
    if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) {
      throw new Error("Ollama returned an invalid stream payload.");
    }
    if (typeof chunk.error === "string" && chunk.error.length > 0) {
      throw new Error("Ollama stream reported an error: " + chunk.error.slice(0, 300));
    }
    if (chunkCount >= maxChunks) {
      throw new Error("Ollama stream exceeded the maximum chunk count.");
    }
    if (typeof chunk.response === "string") {
      const fragmentBytes = Buffer.byteLength(chunk.response, "utf8");
      if (generatedResponseBytes + fragmentBytes > maxResponseBytes) {
        throw new Error("Ollama stream exceeded the maximum response size.");
      }
      generatedResponse += chunk.response;
      generatedResponseBytes += fragmentBytes;
    }
    chunkCount += 1;
    if (chunk.done === true) finalChunk = chunk;
    onChunk({
      chunk_count: chunkCount,
      response_characters: generatedResponse.length,
      done: chunk.done === true,
      eval_count: Number.isInteger(chunk.eval_count) ? chunk.eval_count : null,
    });
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decode(value, true);
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
      if (Buffer.byteLength(buffer, "utf8") > maxLineBytes) {
        throw new Error("Ollama stream exceeded the maximum NDJSON line size.");
      }
    }
    buffer += decode();
    if (buffer.trim()) consumeLine(buffer);
  } catch (error) {
    try { await reader.cancel(); } catch {}
    throw error;
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  if (!finalChunk) throw new Error("Ollama stream ended without a completion marker.");
  return { ...finalChunk, response: generatedResponse };
}

// Retry only a cleanly terminated stream that omitted Ollama's final done marker.
// A new request is issued for each attempt; partial output from a failed attempt is
// never returned or concatenated with the next response.
export async function collectOllamaGenerateStreamWithRetry(createBody, onChunk = () => {}, options = {}) {
  if (typeof createBody !== "function") {
    throw new TypeError("createBody must be a function that returns a fresh readable stream.");
  }
  const maxAttempts = options.maxAttempts ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1000;
  const onRetry = options.onRetry ?? (() => {});
  const streamOptions = options.streamOptions ?? {};

  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) {
    throw new TypeError("maxAttempts must be an integer between 1 and 2.");
  }
  if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 30000) {
    throw new TypeError("retryDelayMs must be an integer between 0 and 30000.");
  }
  if (typeof onRetry !== "function") {
    throw new TypeError("onRetry must be a function.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const body = await createBody(attempt);
    try {
      return await collectOllamaGenerateStream(body, onChunk, streamOptions);
    } catch (error) {
      const incomplete = error instanceof Error &&
        error.message === "Ollama stream ended without a completion marker.";
      if (!incomplete || attempt === maxAttempts) throw error;

      onRetry({ attempt, nextAttempt: attempt + 1, error });
      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw new Error("Ollama stream retry loop ended unexpectedly.");
}

