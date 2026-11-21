export const CORRELATION_ID_HEADER = "x-correlation-id";

const SAFE_CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/**
 * Reuse a bounded, log-safe correlation ID supplied by the incoming request or
 * generate one when the incoming value is absent or malformed. Correlation IDs are
 * diagnostic metadata only and must never be trusted for identity or authorization.
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

export interface CorrelationContext {
  readonly correlationId: string;
  readonly requestHeaders: Headers;
  readonly responseHeaders: Headers;
}

/**
 * Build the paired headers used at the platform edge. The same validated ID is
 * forwarded to the route handler and returned to the caller. Header collections
 * are separate copies so a downstream mutation cannot silently desynchronize them.
 */
export function createCorrelationContext(headers: Headers): CorrelationContext {
  const correlationId = getOrCreateCorrelationId(headers);
  const requestHeaders = new Headers(headers);
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId);

  const responseHeaders = new Headers();
  responseHeaders.set(CORRELATION_ID_HEADER, correlationId);

  return Object.freeze({
    correlationId,
    requestHeaders,
    responseHeaders,
  });
}
