import { runOllamaSmokeTest } from "../lib/ollama-smoke-test.mjs";

const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const timeoutMs = Number(process.env.OLLAMA_SMOKE_TIMEOUT_MS ?? 180000);
try {
  const result = await runOllamaSmokeTest({ baseUrl, timeoutMs });
  console.log("Ollama inference smoke test passed.");
  console.log("Model: " + result.model);
  console.log("Response bytes: " + result.response_bytes);
  console.log("Prompt tokens: " + (result.prompt_eval_count ?? "not reported"));
  console.log("Generated tokens: " + (result.eval_count ?? "not reported"));
  console.log("Total duration ns: " + (result.total_duration_ns ?? "not reported"));
} catch (error) {
  console.error("Ollama inference smoke test failed: " +
    (error instanceof Error ? error.message : "unknown error"));
  process.exitCode = 1;
}
