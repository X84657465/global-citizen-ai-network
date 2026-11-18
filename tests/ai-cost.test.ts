import test from "node:test";
import assert from "node:assert/strict";
import { estimateCostTwd, getAiRuntimeConfig, type AiRuntimeConfig } from "../lib/ai/config.ts";

const config: AiRuntimeConfig = {
  baseUrl: "https://provider.example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  maxRequestCostTwd: 5,
  inputCostPerMillionTwd: 10,
  outputCostPerMillionTwd: 20,
  timeoutMs: 30000,
};

test("estimates input and output token costs using configured per-million rates", () => {
  assert.equal(estimateCostTwd(100000, 50000, config), 2);
});

test("zero usage has zero estimated cost", () => {
  assert.equal(estimateCostTwd(0, 0, config), 0);
});

test("cost calculation does not silently clamp invalid token inputs", () => {
  assert.equal(Number.isNaN(estimateCostTwd(Number.NaN, 1, config)), true);
  assert.equal(Number.isNaN(estimateCostTwd(1, Number.NaN, config)), true);
  assert.equal(estimateCostTwd(-1, 0, config) < 0, true);
});

test("runtime config rejects missing or non-positive pricing instead of enabling an unpriced provider", () => {
  const keys = [
    "AI_PROVIDER", "AI_BASE_URL", "AI_API_KEY", "AI_MODEL",
    "AI_MAX_REQUEST_COST_TWD", "AI_INPUT_COST_PER_MILLION_TWD",
    "AI_OUTPUT_COST_PER_MILLION_TWD", "AI_TIMEOUT_MS",
  ];
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "https://provider.example.test/v1",
      AI_API_KEY: "test-key",
      AI_MODEL: "test-model",
      AI_MAX_REQUEST_COST_TWD: "5",
      AI_INPUT_COST_PER_MILLION_TWD: "0",
      AI_OUTPUT_COST_PER_MILLION_TWD: "20",
    });
    assert.equal(getAiRuntimeConfig(), null);

    process.env.AI_INPUT_COST_PER_MILLION_TWD = "10";
    process.env.AI_OUTPUT_COST_PER_MILLION_TWD = "Infinity";
    assert.equal(getAiRuntimeConfig(), null);

    process.env.AI_OUTPUT_COST_PER_MILLION_TWD = "20";
    process.env.AI_MAX_REQUEST_COST_TWD = "-1";
    assert.equal(getAiRuntimeConfig(), null);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("runtime config caps provider timeout at sixty seconds", () => {
  const keys = [
    "AI_PROVIDER", "AI_BASE_URL", "AI_API_KEY", "AI_MODEL",
    "AI_MAX_REQUEST_COST_TWD", "AI_INPUT_COST_PER_MILLION_TWD",
    "AI_OUTPUT_COST_PER_MILLION_TWD", "AI_TIMEOUT_MS",
  ];
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "https://provider.example.test/v1",
      AI_API_KEY: "test-key",
      AI_MODEL: "test-model",
      AI_MAX_REQUEST_COST_TWD: "5",
      AI_INPUT_COST_PER_MILLION_TWD: "10",
      AI_OUTPUT_COST_PER_MILLION_TWD: "20",
      AI_TIMEOUT_MS: "120000",
    });
    assert.equal(getAiRuntimeConfig()?.timeoutMs, 60000);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
