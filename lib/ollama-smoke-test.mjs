const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["ok"] },
  },
};

export async function runOllamaSmokeTest(options = {}) {
  const baseUrl = String(options.baseUrl ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 180_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 600_000) {
    throw new TypeError("Ollama smoke timeout must be between 10000 and 600000 milliseconds.");
  }

  let tagsResponse;
  try {
    tagsResponse = await fetchImpl(baseUrl + "/api/tags", {
      signal: AbortSignal.timeout(Math.min(timeoutMs, 10_000)),
    });
  } catch {
    throw new Error("Ollama model listing request failed.");
  }
  if (!tagsResponse.ok) throw new Error("Ollama model listing returned HTTP " + tagsResponse.status + ".");
  let tags;
  try { tags = await tagsResponse.json(); }
  catch { throw new Error("Ollama model listing was not valid JSON."); }

  const models = Array.isArray(tags?.models)
    ? tags.models.filter((model) => typeof model?.name === "string" && model.name.length > 0)
    : [];
  if (models.length === 0) throw new Error("No local Ollama model is installed.");
  models.sort((a, b) => (Number.isFinite(a.size) ? a.size : Number.MAX_SAFE_INTEGER) -
    (Number.isFinite(b.size) ? b.size : Number.MAX_SAFE_INTEGER));
  const model = models[0].name;

  let response;
  try {
    response = await fetchImpl(baseUrl + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system: "Return exactly one JSON object matching the supplied schema. Do not use tools.",
        prompt: "Respond with the JSON object whose status is ok.",
        format: SMOKE_SCHEMA,
        think: false,
        stream: false,
        keep_alive: "30s",
        options: { temperature: 0, num_predict: 32 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("Ollama model generation failed or exceeded the smoke-test timeout.");
  }
  if (!response.ok) throw new Error("Ollama generation returned HTTP " + response.status + ".");
  let result;
  try { result = await response.json(); }
  catch { throw new Error("Ollama generation response was not valid JSON."); }
  if (result?.done !== true || typeof result.response !== "string" || result.response.length === 0) {
    throw new Error("Ollama did not complete a non-empty generation response.");
  }

  let generated;
  try { generated = JSON.parse(result.response); }
  catch { throw new Error("Ollama smoke generation did not return valid JSON."); }
  if (!generated || typeof generated !== "object" || Array.isArray(generated) ||
      generated.status !== "ok" || Object.keys(generated).length !== 1) {
    throw new Error("Ollama smoke generation did not satisfy the strict JSON response schema.");
  }

  return {
    model,
    response_bytes: Buffer.byteLength(result.response, "utf8"),
    total_duration_ns: Number.isSafeInteger(result.total_duration) ? result.total_duration : null,
    prompt_eval_count: Number.isSafeInteger(result.prompt_eval_count) ? result.prompt_eval_count : null,
    eval_count: Number.isSafeInteger(result.eval_count) ? result.eval_count : null,
  };
}
