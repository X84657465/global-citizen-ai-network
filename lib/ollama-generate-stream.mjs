export async function collectOllamaGenerateStream(body, onChunk = () => {}) {
  if (!body || typeof body.getReader !== "function") {
    throw new TypeError("Ollama response body is not a readable stream.");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let generatedResponse = "";
  let finalChunk = null;
  let chunkCount = 0;

  const consumeLine = (line) => {
    const value = line.trim();
    if (!value) return;
    let chunk;
    try {
      chunk = JSON.parse(value);
    } catch {
      throw new Error("Ollama returned an invalid NDJSON stream chunk.");
    }
    if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) {
      throw new Error("Ollama returned an invalid stream payload.");
    }
    if (typeof chunk.response === "string") generatedResponse += chunk.response;
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
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
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
