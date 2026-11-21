import assert from "node:assert/strict";
import test from "node:test";
import { securityHeaders } from "../lib/security/headers.ts";

test("baseline security headers include clickjacking, MIME, referrer, and browser capability protections", () => {
  const values = new Map(securityHeaders.map(({ key, value }) => [key.toLowerCase(), value]));

  assert.equal(values.get("x-content-type-options"), "nosniff");
  assert.equal(values.get("x-frame-options"), "DENY");
  assert.equal(values.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(values.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(values.get("x-permitted-cross-domain-policies"), "none");
  assert.equal(values.get("cross-origin-opener-policy"), "same-origin-allow-popups");
});

test("baseline security headers do not set a brittle CSP or cross-origin resource restriction", () => {
  const keys = new Set(securityHeaders.map(({ key }) => key.toLowerCase()));

  // CSP needs a nonce strategy for Next.js streaming/inline bootstrap scripts.
  // CORP can block intentionally embedded future assets, so it is deferred
  // until the asset and integration origins are explicitly inventoried.
  assert.equal(keys.has("content-security-policy"), false);
  assert.equal(keys.has("cross-origin-resource-policy"), false);
});
