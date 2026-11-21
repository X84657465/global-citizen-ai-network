export const CORRELATION_ID_HEADER = "x-correlation-id";

const SAFE_CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/**
 * Reuse a bounded, log-safe correlation ID supplied by a trusted proxy or
 * generate one when the incoming value is absent or malformed.
 *
 * This value is for request correlation only; it is not an identity,
 * authorization claim, or secret.
 */
export function getOrCreateCorrelationId(headers: Pick<Headers, "get">): string {
  const supplied = headers.get(CORRELATION_ID_HEADER);

  if (supplied && SAFE_CORRELATION_ID.test(supplied)) {
    return supplied;
  }

  return globalThis.crypto.randomUUID();
}
