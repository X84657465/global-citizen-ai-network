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

import { parseProviderInvoiceCsv, parseProviderInvoicePreviewPayload, previewProviderInvoiceReconciliation } from "../lib/ai-cost-reconciliation.mjs";

const invoiceCsv = [
  "provider,model,billing_period_start,billing_period_end,source_reference,currency,amount",
  "openai,gpt-test,2026-11-01,2026-11-30,provider-req-1,USD,1.25",
].join("\n");

test("invoice CSV accepts the bounded contract and fingerprints the exact source", () => {
  const parsed = parseProviderInvoiceCsv(invoiceCsv);
  assert.equal(parsed.rowCount, 1);
  assert.equal(parsed.rows[0].sourceReference, "provider-req-1");
  assert.match(parsed.sourceFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(parseProviderInvoiceCsv(invoiceCsv).sourceFingerprint, parsed.sourceFingerprint);
});

test("invoice CSV rejects malformed headers, unsupported currencies, invalid amounts and malformed rows", () => {
  assert.throws(() => parseProviderInvoiceCsv("provider,model\nopenai,gpt"));
  assert.throws(() => parseProviderInvoiceCsv(invoiceCsv.replace(",USD,", ",XYZ,")), /不支援的幣別/);
  assert.throws(() => parseProviderInvoiceCsv(invoiceCsv.replace(",1.25", ",1e3")), /金額必須/);
  assert.throws(() => parseProviderInvoiceCsv(invoiceCsv.replace("provider-req-1,USD,1.25", "provider-req-1,USD")), /欄位數不一致/);
});

test("invoice CSV detects repeated rows and conflicting source references without double counting", () => {
  const parsed = parseProviderInvoiceCsv(invoiceCsv.replace(
    "provider-req-1,USD,1.25",
    "provider-req-1,USD,1.25\nopenai,gpt-test,2026-11-01,2026-11-30,provider-req-1,USD,1.25\nopenai,gpt-test,2026-11-01,2026-11-30,provider-req-1,USD,1.50",
  ));
  const preview = previewProviderInvoiceReconciliation(parsed, []);
  assert.deepEqual(preview.rows.map((row) => row.disposition), [
    "unmatched_estimate", "duplicate_row", "duplicate_reference",
  ]);
  assert.equal(preview.counts.duplicate_row, 1);
  assert.equal(preview.counts.duplicate_reference, 1);
});

test("invoice reconciliation requires exact provider reference, provider, model, period, currency and amount", () => {
  const parsed = parseProviderInvoiceCsv(invoiceCsv);
  const request = {
    id: "request-1", provider: "openai", model: "gpt-test",
    provider_request_id: "provider-req-1", created_at: "2026-11-10T12:00:00.000Z",
    provider_billed_cost: "1.25", provider_billed_currency: "USD",
  };
  const matched = previewProviderInvoiceReconciliation(parsed, [request]);
  assert.equal(matched.rows[0].disposition, "matched_actual");
  assert.equal(matched.rows[0].match?.requestId, "request-1");
  const variance = previewProviderInvoiceReconciliation(parsed, [{ ...request, provider_billed_cost: "1.26" }]);
  assert.equal(variance.rows[0].disposition, "variance");
  const unmatched = previewProviderInvoiceReconciliation(parsed, [{ ...request, provider_request_id: "different" }]);
  assert.equal(unmatched.rows[0].disposition, "unmatched_estimate");
});

test("invoice TWD normalization requires an explicit valid rate and timestamp", () => {
  const parsed = parseProviderInvoiceCsv(invoiceCsv);
  const request: Array<{
    id: string;
    provider: string;
    model: string;
    provider_request_id: string;
    created_at: string;
    provider_billed_cost?: number | string | null;
    provider_billed_currency?: string | null;
  }> = [];
  assert.equal(previewProviderInvoiceReconciliation(parsed, request).rows[0].normalizedTwd, null);
  const normalized = previewProviderInvoiceReconciliation(parsed, request, {
    fromCurrency: "USD", toCurrency: "TWD", rate: 32, timestamp: "2026-11-23T00:00:00.000Z",
  });
  assert.equal(normalized.rows[0].normalizedTwd?.amount, 40);
  assert.equal(previewProviderInvoiceReconciliation(parsed, request, {
    fromCurrency: "USD", toCurrency: "TWD", rate: 32, timestamp: "not-a-date",
  }).rows[0].normalizedTwd, null);
});

test("invoice CSV rejects stray quote characters in unquoted fields", () => {
  assert.throws(() => parseProviderInvoiceCsv(invoiceCsv.replace("openai,gpt-test", 'open"ai,gpt-test')), /雙引號/);
});


test("invoice reconciliation never treats missing billed-cost evidence as a verified zero charge", () => {
  const zeroCsv = invoiceCsv.replace(",USD,1.25", ",USD,0");
  const parsed = parseProviderInvoiceCsv(zeroCsv);
  const baseRequest = {
    id: "request-zero", provider: "openai", model: "gpt-test",
    provider_request_id: "provider-req-1", created_at: "2026-11-10T12:00:00.000Z",
    provider_billed_currency: "USD",
  };
  for (const missingCost of [null, undefined, ""]) {
    const preview = previewProviderInvoiceReconciliation(parsed, [
      { ...baseRequest, provider_billed_cost: missingCost },
    ]);
    assert.notEqual(preview.rows[0].disposition, "matched_actual");
    assert.equal(preview.rows[0].disposition, "variance");
  }
  const verifiedZero = previewProviderInvoiceReconciliation(parsed, [
    { ...baseRequest, provider_billed_cost: "0" },
  ]);
  assert.equal(verifiedZero.rows[0].disposition, "matched_actual");
});


test("invoice preview payload rejects null, arrays, and primitive JSON values", () => {
  for (const payload of [null, [], ["csv"], "text", 42, true]) {
    assert.throws(() => parseProviderInvoicePreviewPayload(payload), /JSON 物件格式/);
  }
});

test("invoice preview payload requires a CSV string", () => {
  for (const payload of [{}, { csv: null }, { csv: 42 }]) {
    assert.throws(() => parseProviderInvoicePreviewPayload(payload), /缺少 CSV 文字/);
  }
});

test("invoice preview payload accepts CSV and normalizes explicit FX evidence", () => {
  const payload = parseProviderInvoicePreviewPayload({
    csv: invoiceCsv,
    fxConversion: {
      fromCurrency: "usd", toCurrency: "twd", rate: 32,
      timestamp: "2026-11-23T00:00:00.000Z",
    },
  });
  assert.equal(payload.csv, invoiceCsv);
  assert.deepEqual(payload.fxConversion, {
    fromCurrency: "USD", toCurrency: "TWD", rate: 32,
    timestamp: "2026-11-23T00:00:00.000Z",
  });
});

test("invoice preview payload rejects malformed FX evidence", () => {
  for (const fxConversion of [
    [], "32",
    { fromCurrency: "USD", toCurrency: "TWD", rate: 0, timestamp: "2026-11-23T00:00:00.000Z" },
    { fromCurrency: "USD", toCurrency: "TWD", rate: 32, timestamp: "not-a-date" },
    { fromCurrency: "ZZZ", toCurrency: "TWD", rate: 32, timestamp: "2026-11-23T00:00:00.000Z" },
    { fromCurrency: "USD", toCurrency: "ZZZ", rate: 32, timestamp: "2026-11-23T00:00:00.000Z" },
  ]) {
    assert.throws(() => parseProviderInvoicePreviewPayload({ csv: invoiceCsv, fxConversion }), /匯率資訊/);
  }
});


test("invoice source references are deduplicated within provider namespaces", () => {
  const sharedReferenceCsv = [
    "provider,model,billing_period_start,billing_period_end,source_reference,currency,amount",
    "openai,gpt-test,2026-11-01,2026-11-30,shared-request-id,USD,1.25",
    "anthropic,claude-test,2026-11-01,2026-11-30,shared-request-id,USD,2.50",
  ].join("\n");
  const parsed = parseProviderInvoiceCsv(sharedReferenceCsv);
  const requests = [
    {
      id: "openai-request", provider: "openai", model: "gpt-test",
      provider_request_id: "shared-request-id", created_at: "2026-11-10T12:00:00.000Z",
      provider_billed_cost: "1.25", provider_billed_currency: "USD",
    },
    {
      id: "anthropic-request", provider: "anthropic", model: "claude-test",
      provider_request_id: "shared-request-id", created_at: "2026-11-11T12:00:00.000Z",
      provider_billed_cost: "2.50", provider_billed_currency: "USD",
    },
  ];

  const preview = previewProviderInvoiceReconciliation(parsed, requests);
  assert.deepEqual(preview.rows.map((row) => row.disposition), [
    "matched_actual", "matched_actual",
  ]);
  assert.deepEqual(preview.rows.map((row) => row.match?.requestId), [
    "openai-request", "anthropic-request",
  ]);
});
