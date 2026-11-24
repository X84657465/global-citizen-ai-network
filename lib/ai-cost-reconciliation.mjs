import { createHash } from "node:crypto";

const MAX_BYTES = 1_000_000;
const MAX_ROWS = 5_000;
const SUPPORTED_CURRENCIES = new Set([
  "AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "INR",
  "JPY", "KRW", "SGD", "TWD", "USD",
]);
const REQUIRED_HEADERS = [
  "provider", "model", "billing_period_start", "billing_period_end",
  "source_reference", "currency", "amount",
];

function fail(message) {
  const error = new Error(message);
  error.code = "invalid_invoice_csv";
  throw error;
}

/**
 * Validate the untrusted JSON envelope for the read-only invoice preview.
 * Kept pure so null, arrays, primitives, and malformed optional FX data can
 * be covered without loading route authentication or database dependencies.
 */
export function parseProviderInvoicePreviewPayload(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    fail("請提供 JSON 物件格式的預覽內容。");
  }
  if (typeof payload.csv !== "string") {
    fail("缺少 CSV 文字內容。");
  }
  let fxConversion = null;
  if (payload.fxConversion !== undefined && payload.fxConversion !== null) {
    const fx = payload.fxConversion;
    if (typeof fx !== "object" || Array.isArray(fx)) {
      fail("匯率資訊格式錯誤。");
    }
    const fromCurrency = typeof fx.fromCurrency === "string" ? fx.fromCurrency.trim().toUpperCase() : "";
    const toCurrency = typeof fx.toCurrency === "string" ? fx.toCurrency.trim().toUpperCase() : "";
    const rate = fx.rate;
    const timestamp = fx.timestamp;
    if (!SUPPORTED_CURRENCIES.has(fromCurrency) || !SUPPORTED_CURRENCIES.has(toCurrency) ||
        !Number.isFinite(rate) || rate <= 0 ||
        typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp))) {
      fail("匯率資訊必須包含支援的幣別、正數匯率及時間戳記。");
    }
    fxConversion = { fromCurrency, toCurrency, rate, timestamp };
  }
  return { csv: payload.csv, fxConversion };
}

function parseCsvRecords(source) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (closedQuote && char !== "," && char !== "\n" && char !== "\r") {
      fail("CSV 引號結束後只能接逗號或換行。");
    }
    if (char === '"' && field.length === 0 && !closedQuote) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
      closedQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      closedQuote = false;
      if (row.some((value) => value.length > 0)) records.push(row);
      row = [];
      if (records.length > MAX_ROWS + 1) fail("CSV 超過 5,000 筆資料列上限。");
    } else {
      if (char === '"') fail("未加引號的 CSV 欄位不可包含雙引號。");
      field += char;
    }
  }
  if (quoted) fail("CSV 欄位有未閉合的引號。");
  row.push(field);
  if (row.some((value) => value.length > 0)) records.push(row);
  if (records.length > MAX_ROWS + 1) fail("CSV 超過 5,000 筆資料列上限。");
  return records;
}

function validDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(label + " 必須使用 YYYY-MM-DD。");
  const date = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail(label + " 不是有效日期。");
  }
  return value;
}

function validText(value, label, maxLength) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    fail(label + " 不可空白、過長或包含控制字元。");
  }
  return normalized;
}

function parseAmount(value) {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(normalized)) {
    fail("金額必須是非負十進位數字，最多 8 位小數。");
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount > 9_999_999_999.99999999) {
    fail("金額超出允許範圍。");
  }
  return { amount, rawAmount: normalized };
}

/**
 * Parse the bounded operator-supplied CSV contract. No persistence, network,
 * logging, or ledger mutation is performed.
 */
export function parseProviderInvoiceCsv(input) {
  if (typeof input !== "string" || input.length === 0) fail("請提供 CSV 文字內容。");
  if (Buffer.byteLength(input, "utf8") > MAX_BYTES) fail("CSV 檔案不可超過 1 MB。");
  const source = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records = parseCsvRecords(source);
  if (records.length < 2) fail("CSV 必須包含標題列及至少一筆資料。");
  const headers = records[0].map((value) => value.trim().toLowerCase());
  if (new Set(headers).size !== headers.length ||
      REQUIRED_HEADERS.some((header) => !headers.includes(header))) {
    fail("CSV 缺少必要欄位或標題重複；必要欄位：" + REQUIRED_HEADERS.join(", ") + "。");
  }
  const indexes = Object.fromEntries(REQUIRED_HEADERS.map((header) => [header, headers.indexOf(header)]));
  const rows = records.slice(1).map((record, index) => {
    if (record.length !== headers.length) fail("第 " + (index + 2) + " 列欄位數不一致。");
    const get = (name) => record[indexes[name]] ?? "";
    const provider = validText(get("provider"), "provider", 120);
    const model = validText(get("model"), "model", 160);
    const billingPeriodStart = validDate(get("billing_period_start").trim(), "billing_period_start");
    const billingPeriodEnd = validDate(get("billing_period_end").trim(), "billing_period_end");
    if (billingPeriodStart > billingPeriodEnd) fail("帳單期間起日不可晚於迄日。");
    const sourceReference = validText(get("source_reference"), "source_reference", 500);
    const currency = get("currency").trim().toUpperCase();
    if (!SUPPORTED_CURRENCIES.has(currency)) fail("不支援的幣別：" + (currency || "(空白)") + "。");
    const parsedAmount = parseAmount(get("amount"));
    return {
      rowNumber: index + 2, provider, model, billingPeriodStart, billingPeriodEnd,
      sourceReference, currency, ...parsedAmount,
    };
  });
  return {
    sourceFingerprint: createHash("sha256").update(source, "utf8").digest("hex"),
    rowCount: rows.length,
    rows,
  };
}

/**
 * Produce a read-only preview. A match is "actual" only when the exact
 * provider request reference, provider, model, billing period, currency and
 * billed amount all agree. No database writes or financial decisions occur.
 *
 * @param {{ sourceFingerprint: string, rows: Array<{ provider: string, model: string, billingPeriodStart: string, billingPeriodEnd: string, sourceReference: string, currency: string, amount: number, rawAmount: string }> }} parsed
 * @param {Array<{ id: string, provider: string, model: string, provider_request_id?: string | null, created_at: string, provider_billed_cost?: number | string | null, provider_billed_currency?: string | null }>} requests
 * @param {{ fromCurrency?: string, toCurrency?: string, rate?: number, timestamp?: string } | null} [fxConversion=null]
 */
export function previewProviderInvoiceReconciliation(parsed, requests, fxConversion = null) {
  if (!parsed || !Array.isArray(parsed.rows) || !Array.isArray(requests)) {
    fail("對帳預覽輸入格式錯誤。");
  }
  const seenRows = new Set();
  const seenReferences = new Map();
  const requestByReference = new Map();
  for (const request of requests) {
    if (request?.provider_request_id) {
      const key = String(request.provider_request_id);
      if (!requestByReference.has(key)) requestByReference.set(key, []);
      requestByReference.get(key).push(request);
    }
  }
  const rows = parsed.rows.map((row) => {
    const rowKey = [row.provider,row.model,row.billingPeriodStart,row.billingPeriodEnd,
      row.sourceReference,row.currency,row.rawAmount].join("\u001f");
    if (seenRows.has(rowKey)) {
      return { ...row, disposition: "duplicate_row", match: null, normalizedTwd: null };
    }
    seenRows.add(rowKey);
    // Provider request references are scoped to their provider namespace.
    // Identical opaque IDs from different providers must not suppress each other.
    const referenceKey = JSON.stringify([row.provider, row.sourceReference]);
    const prior = seenReferences.get(referenceKey);
    if (prior) {
      return { ...row, disposition: "duplicate_reference", match: null, normalizedTwd: null };
    }
    seenReferences.set(referenceKey, rowKey);
    const candidates = requestByReference.get(row.sourceReference) ?? [];
    const match = candidates.find((request) => {
      const created = Date.parse(request.created_at);
      const start = Date.parse(row.billingPeriodStart + "T00:00:00.000Z");
      const end = Date.parse(row.billingPeriodEnd + "T23:59:59.999Z");
      return request.provider === row.provider && request.model === row.model &&
        Number.isFinite(created) && created >= start && created <= end;
    });
    let disposition = "unmatched_estimate";
    let matchSummary = null;
    if (match) {
      const rawBilled = match.provider_billed_cost;
      const hasBilledEvidence = rawBilled !== null && rawBilled !== undefined &&
        !(typeof rawBilled === "string" && rawBilled.trim() === "");
      const billed = hasBilledEvidence ? Number(rawBilled) : Number.NaN;
      const billedCurrency = String(match.provider_billed_currency ?? "").trim().toUpperCase();
      if (billedCurrency === row.currency && Number.isFinite(billed) && billed === row.amount) {
        disposition = "matched_actual";
        matchSummary = { requestId: match.id, evidence: "exact_provider_reference_and_amount" };
      } else {
        disposition = "variance";
        matchSummary = { requestId: match.id, evidence: "exact_provider_reference_amount_or_currency_differs" };
      }
    }
    let normalizedTwd = null;
    if (fxConversion && fxConversion.toCurrency === "TWD" &&
        fxConversion.fromCurrency === row.currency &&
        Number.isFinite(fxConversion.rate) && fxConversion.rate > 0 &&
        typeof fxConversion.timestamp === "string" &&
        Number.isFinite(Date.parse(fxConversion.timestamp))) {
      normalizedTwd = {
        amount: Number((row.amount * fxConversion.rate).toFixed(8)),
        rate: fxConversion.rate,
        timestamp: fxConversion.timestamp,
      };
    }
    return { ...row, disposition, match: matchSummary, normalizedTwd };
  });
  return {
    sourceFingerprint: parsed.sourceFingerprint,
    rowCount: rows.length,
    counts: rows.reduce((result, row) => {
      result[row.disposition] = (result[row.disposition] ?? 0) + 1;
      return result;
    }, /** @type {Record<string, number>} */ ({})),
    rows,
  };
}


/**
 * Execute the bounded invoice preview route with injectable authentication and
 * database dependencies. This keeps the HTTP boundary behavior testable while
 * ensuring the only database operation is a read of request-level evidence.
 *
 * @param {Request} request
 * @param {{
 *   getAuthenticatedClient: () => Promise<any>,
 *   getProfile: (auth: any) => Promise<any>,
 *   hasServiceRoleKey: () => boolean,
 *   createAdminClient: () => any
 * }} dependencies
 * @returns {Promise<Response>}
 */
export async function handleProviderInvoicePreviewPost(request, dependencies) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const json = (body, status = 200) => Response.json(body, { status, headers });

  let auth;
  try {
    auth = await dependencies.getAuthenticatedClient();
  } catch {
    return json({ error: "無法驗證登入狀態。" }, 503);
  }
  if (!auth) return json({ error: "請先登入。" }, 401);

  let profileResult;
  try {
    profileResult = await dependencies.getProfile(auth);
  } catch {
    return json({ error: "無法驗證管理員權限。" }, 503);
  }
  if (!profileResult || profileResult.error) {
    return json({ error: "無法驗證管理員權限。" }, 503);
  }
  const profile = profileResult.data;
  if (!profile || profile.role !== "admin" || profile.account_status !== "active") {
    return json({ error: "只有有效管理員可以預覽供應商帳單。" }, 403);
  }

  let hasServiceRoleKey = false;
  try {
    hasServiceRoleKey = dependencies.hasServiceRoleKey();
  } catch {
    return json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, 503);
  }
  if (!hasServiceRoleKey) {
    return json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, 503);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 1_100_000) {
    return json({ error: "上傳內容不可超過 1 MB。" }, 413);
  }

  let payload;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "缺少上傳內容。" }, 400);
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1_100_000) {
        await reader.cancel();
        return json({ error: "上傳內容不可超過 1 MB。" }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return json({ error: "請提供有效的 UTF-8 JSON 與 CSV 文字。" }, 400);
  }

  let invoicePayload;
  try {
    invoicePayload = parseProviderInvoicePreviewPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "預覽內容格式錯誤。";
    return json({ error: message }, 400);
  }

  let parsed;
  try {
    parsed = parseProviderInvoiceCsv(invoicePayload.csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV 預覽失敗。";
    return json({ error: message }, 400);
  }

  const starts = parsed.rows.map((row) => row.billingPeriodStart).sort();
  const ends = parsed.rows.map((row) => row.billingPeriodEnd).sort();
  const startAt = starts[0] + "T00:00:00.000Z";
  const endAt = ends[ends.length - 1] + "T23:59:59.999Z";

  let requestResult;
  try {
    const admin = dependencies.createAdminClient();
    requestResult = await admin.from("ai_requests")
      .select("id,provider,model,provider_request_id,created_at,provider_billed_cost,provider_billed_currency")
      .gte("created_at", startAt)
      .lte("created_at", endAt)
      .not("provider_request_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(5001);
  } catch {
    return json({ error: "AI 請求證據讀取失敗，無法安全產生預覽。" }, 503);
  }
  if (!requestResult || requestResult.error) {
    return json({ error: "AI 請求證據讀取失敗，無法安全產生預覽。" }, 503);
  }
  const requests = requestResult.data ?? [];
  if (!Array.isArray(requests)) {
    return json({ error: "AI 請求證據格式錯誤，無法安全產生預覽。" }, 503);
  }
  if (requests.length > 5000) {
    return json({ error: "指定帳單期間涵蓋超過 5,000 筆請求；請縮小期間後重新預覽。" }, 413);
  }

  let preview;
  try {
    preview = previewProviderInvoiceReconciliation(parsed, requests, invoicePayload.fxConversion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV 預覽失敗。";
    return json({ error: message }, 400);
  }

  return json(
    { preview, note: "唯讀預覽；不會寫入帳本、保存發票、調整預算或執行付款。" },
    200,
  );
}
