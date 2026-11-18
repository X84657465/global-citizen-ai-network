import assert from "node:assert/strict";
import test from "node:test";
import { canCorrectReconciliationSubmission } from "../lib/ai/reconciliation-form-error.ts";

test("allows correction for validation and oversized-body errors before the privileged RPC", () => {
  assert.equal(canCorrectReconciliationSubmission(400), true);
  assert.equal(canCorrectReconciliationSubmission(413), true);
});

test("keeps payload and idempotency key locked for potentially ambiguous failures", () => {
  for (const status of [401, 403, 409, 429, 500, 502, 503, 504]) {
    assert.equal(canCorrectReconciliationSubmission(status), false, `status ${status}`);
  }
});
