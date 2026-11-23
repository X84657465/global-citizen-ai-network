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
    const prior = seenReferences.get(row.sourceReference);
    if (prior) {
      return { ...row, disposition: "duplicate_reference", match: null, normalizedTwd: null };
    }
    seenReferences.set(row.sourceReference, rowKey);
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
      const billed = Number(match.provider_billed_cost);
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
    }, {}),
    rows,
  };
}
