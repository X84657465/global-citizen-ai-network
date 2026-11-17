import test from "node:test";
import assert from "node:assert/strict";
import { getAiRuntimeConfig } from "../lib/ai/config.ts";

const envKeys = [
  "AI_PROVIDER", "AI_BASE_URL", "AI_API_KEY", "AI_MODEL",
  "AI_MAX_REQUEST_COST_TWD", "AI_INPUT_COST_PER_MILLION_TWD",
  "AI_OUTPUT_COST_PER_MILLION_TWD", "AI_TIMEOUT_MS",
];

function withConfig(overrides: Record<string, string>, run: () => void) {
  const previous = new Map(envKeys.map(key => [key, process.env[key]]));
  try {
    for (const key of envKeys) delete process.env[key];
    Object.assign(process.env, {
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "https://api.example.test/v1",
      AI_API_KEY: "test-key",
      AI_MODEL: "test-model",
      AI_MAX_REQUEST_COST_TWD: "5",
      AI_INPUT_COST_PER_MILLION_TWD: "10",
      AI_OUTPUT_COST_PER_MILLION_TWD: "20",
      ...overrides,
    });
    run();
  } finally {
    for (const key of envKeys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("accepts HTTPS providers and normalizes trailing slashes", () => {
  withConfig({ AI_BASE_URL: "https://api.example.test/v1///" }, () => {
    assert.equal(getAiRuntimeConfig()?.baseUrl, "https://api.example.test/v1");
  });
});

test("allows plain HTTP only for loopback development endpoints", () => {
  withConfig({ AI_BASE_URL: "http://localhost:11434/v1" }, () => {
    assert.equal(getAiRuntimeConfig()?.baseUrl, "http://localhost:11434/v1");
  });
  withConfig({ AI_BASE_URL: "http://127.0.0.1:11434/v1" }, () => {
    assert.equal(getAiRuntimeConfig()?.baseUrl, "http://127.0.0.1:11434/v1");
  });
});

test("rejects insecure non-loopback and non-HTTP protocols", () => {
  for (const url of ["http://provider.example.test/v1", "ftp://localhost/v1", "file://localhost/etc"]) {
    withConfig({ AI_BASE_URL: url }, () => assert.equal(getAiRuntimeConfig(), null));
  }
});

test("rejects URL credentials, query strings, and fragments", () => {
  for (const url of [
    "https://user:password@api.example.test/v1",
    "https://api.example.test/v1?token=secret",
    "https://api.example.test/v1#fragment",
  ]) {
    withConfig({ AI_BASE_URL: url }, () => assert.equal(getAiRuntimeConfig(), null));
  }
});

test("rejects oversized endpoint, key, and model configuration", () => {
  withConfig({ AI_BASE_URL: "https://a.test/" + "x".repeat(2048) }, () => assert.equal(getAiRuntimeConfig(), null));
  withConfig({ AI_API_KEY: "x".repeat(4097) }, () => assert.equal(getAiRuntimeConfig(), null));
  withConfig({ AI_MODEL: "x".repeat(161) }, () => assert.equal(getAiRuntimeConfig(), null));
});
