export type AiRuntimeConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxRequestCostTwd: number;
  inputCostPerMillionTwd: number;
  outputCostPerMillionTwd: number;
  timeoutMs: number;
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAiRuntimeConfig(): AiRuntimeConfig | null {
  if (process.env.AI_PROVIDER !== "openai-compatible") return null;
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) return null;

  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
  } catch {
    return null;
  }

  const maxRequestCostTwd = positiveNumber(process.env.AI_MAX_REQUEST_COST_TWD, 0);
  const inputCostPerMillionTwd = positiveNumber(process.env.AI_INPUT_COST_PER_MILLION_TWD, 0);
  const outputCostPerMillionTwd = positiveNumber(process.env.AI_OUTPUT_COST_PER_MILLION_TWD, 0);
  if (!maxRequestCostTwd || !inputCostPerMillionTwd || !outputCostPerMillionTwd) return null;

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model,
    maxRequestCostTwd,
    inputCostPerMillionTwd,
    outputCostPerMillionTwd,
    timeoutMs: Math.min(positiveNumber(process.env.AI_TIMEOUT_MS, 30000), 60000),
  };
}

export function estimateCostTwd(
  inputTokens: number,
  outputTokens: number,
  config: AiRuntimeConfig,
) {
  return (
    (inputTokens * config.inputCostPerMillionTwd +
      outputTokens * config.outputCostPerMillionTwd) /
    1_000_000
  );
}
