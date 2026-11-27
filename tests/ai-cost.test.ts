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

import { handleProviderInvoicePreviewPost, parseProviderInvoiceCsv, parseProviderInvoicePreviewPayload, previewProviderInvoiceReconciliation } from "../lib/ai-cost-reconciliation.mjs";

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
  assert.equal((preview.counts as Record<string, number>).duplicate_row, 1);
  assert.equal((preview.counts as Record<string, number>).duplicate_reference, 1);
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

test("invoice reconciliation fails closed when a provider reference maps to multiple in-period requests", () => {
  const parsed = parseProviderInvoiceCsv(invoiceCsv);
  const baseRequest = {
    provider: "openai", model: "gpt-test", provider_request_id: "provider-req-1",
    created_at: "2026-11-10T12:00:00.000Z",
    provider_billed_cost: "1.25", provider_billed_currency: "USD",
  };
  const preview = previewProviderInvoiceReconciliation(parsed, [
    { ...baseRequest, id: "request-one" },
    { ...baseRequest, id: "request-two" },
  ]);
  assert.equal(preview.rows[0].disposition, "ambiguous_match");
  assert.equal(preview.rows[0].match, null);
  assert.equal((preview.counts as Record<string, number>).ambiguous_match, 1);
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


type PreviewRouteTestDependencies = {
  calls: string[];
  getAuthenticatedClient: () => Promise<unknown>;
  getProfile: (auth: unknown) => Promise<{ data: unknown; error: unknown }>;
  hasServiceRoleKey: () => boolean;
  createAdminClient: () => unknown;
};

type PreviewRequestResult = { data: unknown[] | null; error: unknown };
type PreviewQuery = {
  select: (columns: string) => PreviewQuery;
  gte: (column: string, value: string) => PreviewQuery;
  lte: (column: string, value: string) => PreviewQuery;
  not: (column: string, operator: string, value: null) => PreviewQuery;
  order: (column: string, options: { ascending: boolean }) => PreviewQuery;
  limit: (count: number) => Promise<PreviewRequestResult>;
};

function makePreviewRouteDependencies(
  overrides: Partial<Omit<PreviewRouteTestDependencies, "calls">> = {},
  requestResult: PreviewRequestResult = { data: [], error: null },
): PreviewRouteTestDependencies {
  const calls: string[] = [];
  const defaults: Omit<PreviewRouteTestDependencies, "calls"> = {
    getAuthenticatedClient: async () => {
      calls.push("auth");
      return { user: { id: "admin-1" } };
    },
    getProfile: async () => {
      calls.push("profile");
      return { data: { role: "admin", account_status: "active" }, error: null };
    },
    hasServiceRoleKey: () => true,
    createAdminClient: () => {
      calls.push("admin-client");
      const query: PreviewQuery = {
        select: (columns) => { calls.push("select:" + columns); return query; },
        gte: (column) => { calls.push("gte:" + column); return query; },
        lte: (column) => { calls.push("lte:" + column); return query; },
        not: (column) => { calls.push("not:" + column); return query; },
        order: (column) => { calls.push("order:" + column); return query; },
        limit: (count) => { calls.push("limit:" + count); return Promise.resolve(requestResult); },
      };
      return {
        from: (table: string) => {
          calls.push("from:" + table);
          return query;
        },
      };
    },
  };
  return { calls, ...defaults, ...overrides };
}

const routeInvoiceCsv = [
  "provider,model,billing_period_start,billing_period_end,source_reference,currency,amount",
  "openai,gpt-test,2026-11-01,2026-11-30,provider-req-1,USD,1.25",
].join("\n");

function makeInvoicePreviewRequest(body: string | Uint8Array, headers: Record<string, string> = {}) {
  const requestBody: BodyInit = typeof body === "string" ? body : (() => {
    const buffer = new ArrayBuffer(body.byteLength);
    new Uint8Array(buffer).set(body);
    return buffer;
  })();
  return new Request("https://example.test/api/admin/ai-costs", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: requestBody,
  });
}

test("invoice preview POST returns 401 before profile or database access", async () => {
  const deps = makePreviewRouteDependencies();
  deps.getAuthenticatedClient = async () => { deps.calls.push("auth"); return null; };
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(deps.calls, ["auth"]);
});

test("invoice preview POST returns 503 for profile lookup failure and 403 for inactive non-admin", async () => {
  const unavailable = makePreviewRouteDependencies({
    getProfile: async () => { throw new Error("profile provider unavailable"); },
  });
  const unavailableResponse = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), unavailable,
  );
  assert.equal(unavailableResponse.status, 503);
  assert.deepEqual(unavailable.calls, ["auth"]);

  const forbidden = makePreviewRouteDependencies({
    getProfile: async () => ({
      data: { role: "admin", account_status: "suspended" }, error: null,
    }),
  });
  const forbiddenResponse = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), forbidden,
  );
  assert.equal(forbiddenResponse.status, 403);
  assert.deepEqual(forbidden.calls, ["auth"]);
});

test("invoice preview POST fails closed when server database configuration is missing", async () => {
  const deps = makePreviewRouteDependencies({ hasServiceRoleKey: () => false });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("invoice preview POST rejects malformed JSON, invalid UTF-8, null, arrays and primitives", async () => {
  const invalidBodies: Array<string | Uint8Array> = [
    "{",
    new Uint8Array([0xc3, 0x28]),
    "null",
    "[]",
    "42",
    '"text"',
  ];
  for (const body of invalidBodies) {
    const deps = makePreviewRouteDependencies();
    const response = await handleProviderInvoicePreviewPost(makeInvoicePreviewRequest(body), deps);
    assert.equal(response.status, 400);
    assert.deepEqual(deps.calls, ["auth", "profile"]);
  }
});

test("invoice preview POST rejects oversized declared bodies before reading or querying", async () => {
  const deps = makePreviewRouteDependencies();
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest("{}", { "content-length": "1100001" }), deps,
  );
  assert.equal(response.status, 413);
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("invoice preview POST returns 503 when request evidence cannot be read", async () => {
  const deps = makePreviewRouteDependencies({}, { data: null, error: new Error("database unavailable") });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 503);
  assert.ok(deps.calls.includes("from:ai_requests"));
});

test("invoice preview POST rejects billing windows with more than 5,000 request records", async () => {
  const deps = makePreviewRouteDependencies({}, {
    data: Array.from({ length: 5001 }, () => ({})), error: null,
  });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 413);
});

test("invoice preview POST returns a private read-only evidence preview without database writes", async () => {
  const deps = makePreviewRouteDependencies({}, {
    data: [{
      id: "request-1", provider: "openai", model: "gpt-test",
      provider_request_id: "provider-req-1", created_at: "2026-11-10T12:00:00.000Z",
      provider_billed_cost: "1.25", provider_billed_currency: "USD",
    }],
    error: null,
  });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  const body = await response.json() as {
    preview: { rows: Array<{ disposition: string }> };
    note: string;
  };
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(body.preview.rows[0].disposition, "matched_actual");
  assert.match(body.note, /唯讀預覽/);
  assert.deepEqual(deps.calls.filter(call => call.startsWith("from:")), ["from:ai_requests"]);
  assert.equal(deps.calls.some(call => /insert|update|upsert|delete/i.test(call)), false);
});


test("invoice preview POST enforces the streamed body limit even without a declared content length", async () => {
  const deps = makePreviewRouteDependencies();
  const oversizedBody = "x".repeat(1_100_001);
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(oversizedBody), deps,
  );
  assert.equal(response.status, 413);
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("invoice preview POST preserves 413 when oversized stream cancellation rejects", async () => {
  const deps = makePreviewRouteDependencies();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(1_100_001));
    },
    cancel() {
      return Promise.reject(new Error("stream cancellation failed"));
    },
  });
  const request = {
    headers: { get: () => null },
    body,
  } as unknown as Request;

  const response = await handleProviderInvoicePreviewPost(request, deps);
  assert.equal(response.status, 413);
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});


test("invoice preview POST returns 413 when oversized stream cancellation never settles", async () => {
  const deps = makePreviewRouteDependencies();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(1_100_001));
    },
    cancel() {
      return new Promise<void>(() => {});
    },
  });
  const request = {
    headers: { get: () => null },
    body,
  } as unknown as Request;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutGuard = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("handler did not return promptly")), 1_000);
  });
  let response: Response;
  try {
    response = await Promise.race([
      handleProviderInvoicePreviewPost(request, deps),
      timeoutGuard,
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
  assert.equal(response.status, 413);
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("invoice preview POST returns a non-sensitive 503 when authentication lookup throws", async () => {
  const deps = makePreviewRouteDependencies({
    getAuthenticatedClient: async () => { throw new Error("auth provider detail must not escape"); },
  });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "無法驗證登入狀態。" });
  assert.deepEqual(deps.calls, []);
});

test("invoice preview POST fails closed when profile lookup returns an error result", async () => {
  const deps = makePreviewRouteDependencies({
    getProfile: async () => ({ data: null, error: new Error("profile detail must not escape") }),
  });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "無法驗證管理員權限。" });
  assert.deepEqual(deps.calls, ["auth"]);
});

test("invoice preview POST fails closed when database-key configuration lookup throws", async () => {
  const deps = makePreviewRouteDependencies({
    hasServiceRoleKey: () => { throw new Error("configuration detail must not escape"); },
  });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "伺服器尚未設定管理端資料庫金鑰。" });
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("invoice preview POST fails closed when admin database client creation throws", async () => {
  const deps = makePreviewRouteDependencies({
    createAdminClient: () => { throw new Error("database client detail must not escape"); },
  });
  const response = await handleProviderInvoicePreviewPost(
    makeInvoicePreviewRequest(JSON.stringify({ csv: routeInvoiceCsv })), deps,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "AI 請求證據讀取失敗，無法安全產生預覽。" });
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});
