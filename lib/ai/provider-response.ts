export const MAX_PROVIDER_RESPONSE_BYTES = 1024 * 1024;
const MAX_PROVIDER_CONTENT_CHARACTERS = 40000;
const MAX_PROVIDER_TOKEN_COUNT = 1000000;

// Only explicit request-validation/authentication failures are treated as
// known non-billable rejections. Generic provider-specific 4xx responses such
// as 409/425/429 remain uncertain unless a provider adapter proves otherwise.
export function isKnownProviderRejection(status: number): boolean {
  return [400, 401, 403, 404, 422].includes(status);
}

export class ProviderResponseError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ProviderResponseError";
    this.code = code;
  }
}

type JsonObject = Record<string, unknown>;

export type ParsedProviderResponse = {
  answer: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  providerRequestId: string | null;
  usageSource: "provider" | "provider_partial_with_fallback" | "conservative_character_fallback";
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenCount(
  value: unknown,
  fallback: number,
  field: string,
): { value: number; supplied: boolean } {
  if (value === undefined) return { value: fallback, supplied: false };
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_PROVIDER_TOKEN_COUNT
  ) {
    throw new ProviderResponseError(`invalid_${field}`);
  }
  return { value, supplied: true };
}

async function cancelProviderBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // A rejected response must not be allowed to leak a still-readable body.
    // Cancellation is best effort because the upstream may already have closed.
  }
}

export async function readProviderJson(
  response: Response,
  maxBytes = MAX_PROVIDER_RESPONSE_BYTES,
): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      await cancelProviderBody(response);
      throw new ProviderResponseError("invalid_content_length");
    }
    if (length > maxBytes) {
      await cancelProviderBody(response);
      throw new ProviderResponseError("response_too_large");
    }
  }

  if (!response.body) throw new ProviderResponseError("empty_provider_body");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The response is already rejected; cancellation is best effort.
        }
        throw new ProviderResponseError("response_too_large");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ProviderResponseError) throw error;
    throw new ProviderResponseError("provider_body_read_failed");
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ProviderResponseError("invalid_provider_json");
  }
}

export function parseProviderResponse(
  value: unknown,
  fallbackInputTokens: number,
): ParsedProviderResponse {
  if (!isObject(value) || !Array.isArray(value.choices) || value.choices.length === 0) {
    throw new ProviderResponseError("invalid_provider_choices");
  }

  const firstChoice = value.choices[0];
  if (!isObject(firstChoice) || !isObject(firstChoice.message)) {
    throw new ProviderResponseError("invalid_provider_message");
  }

  const rawContent = firstChoice.message.content;
  let answer: string;
  if (typeof rawContent === "string") {
    answer = rawContent;
  } else if (Array.isArray(rawContent)) {
    const parts: string[] = [];
    for (const part of rawContent) {
      if (!isObject(part) || (part.type !== undefined && part.type !== "text") || typeof part.text !== "string") {
        throw new ProviderResponseError("invalid_provider_content_part");
      }
      parts.push(part.text);
    }
    answer = parts.join("");
  } else {
    throw new ProviderResponseError("invalid_provider_content");
  }

  answer = answer.trim();
  if (answer.length < 1 || answer.length > MAX_PROVIDER_CONTENT_CHARACTERS) {
    throw new ProviderResponseError("invalid_provider_answer_length");
  }

  const fallbackInput = Number.isSafeInteger(fallbackInputTokens) && fallbackInputTokens >= 0
    ? fallbackInputTokens
    : 0;
  const fallbackOutput = answer.length;

  let inputTokens = fallbackInput;
  let outputTokens = fallbackOutput;
  let cachedTokens = 0;
  let usageSource: ParsedProviderResponse["usageSource"] = "conservative_character_fallback";

  if (value.usage !== undefined && value.usage !== null) {
    if (!isObject(value.usage)) throw new ProviderResponseError("invalid_provider_usage");

    const input = tokenCount(value.usage.prompt_tokens, fallbackInput, "prompt_tokens");
    const output = tokenCount(value.usage.completion_tokens, fallbackOutput, "completion_tokens");
    inputTokens = input.value;
    outputTokens = output.value;

    const details = value.usage.prompt_tokens_details;
    if (details !== undefined && details !== null) {
      if (!isObject(details)) throw new ProviderResponseError("invalid_provider_usage_details");
      cachedTokens = tokenCount(details.cached_tokens, 0, "cached_tokens").value;
    }

    if ((input.supplied && inputTokens === 0 && fallbackInput > 0) || (output.supplied && outputTokens === 0 && answer.length > 0)) {
      throw new ProviderResponseError("zero_token_usage_for_nonempty_content");
    }

    if (cachedTokens > inputTokens) {
      throw new ProviderResponseError("cached_tokens_exceed_prompt_tokens");
    }

    usageSource = input.supplied && output.supplied
      ? "provider"
      : "provider_partial_with_fallback";
  }

  let providerRequestId: string | null = null;
  if (value.id !== undefined && value.id !== null) {
    if (typeof value.id !== "string" || value.id.trim().length < 1 || value.id.length > 256) {
      throw new ProviderResponseError("invalid_provider_request_id");
    }
    providerRequestId = value.id.trim();
  }

  return { answer, inputTokens, outputTokens, cachedTokens, providerRequestId, usageSource };
}

export function safeProviderRequestId(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 256 ? normalized : null;
}
