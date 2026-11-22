export class GitHubApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = details.status ?? null;
    this.method = details.method ?? "GET";
    this.path = details.path ?? "";
    this.retryAfter = details.retryAfter ?? null;
    this.rateLimitReset = details.rateLimitReset ?? null;
    this.rateLimitRemaining = details.rateLimitRemaining ?? null;
    this.rateLimited = details.rateLimited === true;
    this.retryAfterMs = details.retryAfterMs ?? null;
  }
}

const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryableReadMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function parseRetryAfter(value, now) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null;
}

function parseRateReset(value, now) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const timestamp = number > 1e12 ? number : number * 1000;
  return Math.max(0, timestamp - now);
}

export function createGitHubApiClient(options = {}) {
  const baseUrl = String(options.baseUrl ?? "https://api.github.com").replace(/\/+$/, "");
  const token = options.token ?? "";
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sleep = options.sleep ?? sleepDefault;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRetries = options.maxRetries ?? 2;
  const maxInlineRetryDelayMs = options.maxInlineRetryDelayMs ?? 30_000;
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new TypeError("timeoutMs must be between 100 and 120000.");
  if (!Number.isSafeInteger(maxRetries) || maxRetries < 0 || maxRetries > 5) throw new TypeError("maxRetries must be between 0 and 5.");
  if (!Number.isSafeInteger(maxInlineRetryDelayMs) || maxInlineRetryDelayMs < 0 || maxInlineRetryDelayMs > 300_000) throw new TypeError("maxInlineRetryDelayMs must be between 0 and 300000.");

  async function request(path, requestOptions = {}) {
    const method = String(requestOptions.method ?? "GET").toUpperCase();
    const safeToRetry = retryableReadMethods.has(method) || (requestOptions.retrySafe === true && method !== "POST");
    const retries = requestOptions.retries ?? maxRetries;
    if (!Number.isSafeInteger(retries) || retries < 0 || retries > 5) throw new TypeError("retries must be between 0 and 5.");
    let attempt = 0;
    while (true) {
      let response;
      try {
        response = await fetchImpl(baseUrl + path, {
          method,
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(token ? { Authorization: "Bearer " + token } : {}),
            ...(requestOptions.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(requestOptions.headers ?? {}),
          },
          ...(requestOptions.body !== undefined ? { body: typeof requestOptions.body === "string" ? requestOptions.body : JSON.stringify(requestOptions.body) } : {}),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (safeToRetry && attempt < retries) {
          const delay = Math.min(10_000, 500 * (2 ** attempt));
          attempt += 1;
          await sleep(delay);
          continue;
        }
        throw new GitHubApiError("GitHub API network/timeout failure: " + method + " " + path + ": " + String(error?.message ?? error), { method, path });
      }

      const retryAfter = response.headers?.get?.("retry-after") ?? null;
      const rateLimitReset = response.headers?.get?.("x-ratelimit-reset") ?? null;
      const rateLimitRemaining = response.headers?.get?.("x-ratelimit-remaining") ?? null;
      let text = "";
      try {
        if (method !== "HEAD") text = await response.text();
      } catch (cause) {
        const rateLimited = response.status === 429 ||
          (response.status === 403 && rateLimitRemaining === "0");
        const transientServerError = response.status >= 500 && response.status <= 599;
        const error = new GitHubApiError(
          "GitHub API response body read failure: " + method + " " + path + ": " +
            String(cause?.message ?? cause),
          {
            status: response.status,
            method,
            path,
            retryAfter,
            rateLimitReset,
            rateLimitRemaining,
            rateLimited,
          },
        );
        if (safeToRetry && attempt < retries && (rateLimited || transientServerError || response.ok)) {
          let delay = parseRetryAfter(retryAfter, now());
          if (delay === null && rateLimitRemaining === "0") delay = parseRateReset(rateLimitReset, now());
          if (delay === null && rateLimited) delay = 60_000;
          if (delay === null) delay = Math.min(10_000, 500 * (2 ** attempt));
          if (delay > maxInlineRetryDelayMs) {
            error.retryAfterMs = delay;
            throw error;
          }
          attempt += 1;
          await sleep(delay);
          continue;
        }
        throw error;
      }
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch {
          throw new GitHubApiError("GitHub API returned invalid JSON for " + method + " " + path, { status: response.status, method, path });
        }
      }
      if (response.ok) return data;

      const message = String(data?.message ?? response.statusText ?? "request failed").slice(0, 500);
      const rateLimited = response.status === 429 ||
        (response.status === 403 && (rateLimitRemaining === "0" || /secondary rate|abuse detection|rate limit/i.test(message)));
      const error = new GitHubApiError("GitHub API " + method + " " + path + " returned HTTP " + response.status + ": " + message, {
        status: response.status, method, path, retryAfter, rateLimitReset, rateLimitRemaining, rateLimited,
      });
      const transientServerError = response.status >= 500 && response.status <= 599;
      if (safeToRetry && attempt < retries && (rateLimited || transientServerError)) {
        let delay = parseRetryAfter(retryAfter, now());
        if (delay === null && rateLimitRemaining === "0") delay = parseRateReset(rateLimitReset, now());
        if (delay === null && rateLimited) delay = 60_000;
        if (delay === null) delay = Math.min(10_000, 500 * (2 ** attempt));
        if (delay > maxInlineRetryDelayMs) {
          error.retryAfterMs = delay;
          throw error;
        }
        attempt += 1;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  return Object.freeze({ request });
}