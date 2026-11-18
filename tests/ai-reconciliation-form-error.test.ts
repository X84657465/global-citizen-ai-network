import test from "node:test";
import assert from "node:assert/strict";
import { canCorrectReconciliationSubmission } from "../lib/ai/reconciliation-form-error.ts";

test("allows correction only for pre-RPC HTTP 400 validation failures", () => {
  assert.equal(canCorrectReconciliationSubmission(400), true);
  for (const status of [401, 403, 409, 413, 429, 500, 502, 503]) {
    assert.equal(canCorrectReconciliationSubmission(status), false, `status ${status}`);
  }
});
