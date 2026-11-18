import test from "node:test";
import assert from "node:assert/strict";
import { parseReconciliationInput } from "../lib/ai/reconciliation-input.ts";

const validBase = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  idempotencyKey: "123e4567-e89b-42d3-a456-426614174001",
  decision: "confirmed_not_billed",
  provider: "Example Provider",
  evidenceReference: "ticket-123456",
  rationale: "Provider dashboard confirms no billable request was recorded.",
};

test("accepts a valid non-billed reconciliation without cost fields", () => {
  const result = parseReconciliationInput(validBase);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.decision, "confirmed_not_billed");
});

test("accepts a billed reconciliation with finite non-negative amounts and ISO currency", () => {
  const result = parseReconciliationInput({
    ...validBase,
    decision: "confirmed_billed",
    providerBilledCost: 0.25,
    providerBilledCurrency: "USD",
    normalizedCostTwd: 8.1,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.providerBilledCurrency, "USD");
});

test("rejects malformed identifiers, decisions, and incomplete evidence", () => {
  for (const patch of [
    { requestId: "not-a-uuid" },
    { idempotencyKey: "not-a-uuid" },
    { decision: "approve" },
    { provider: " " },
    { evidenceReference: "short" },
    { rationale: "too short" },
  ]) {
    assert.equal(parseReconciliationInput({ ...validBase, ...patch }).ok, false);
  }
});

test("rejects negative, infinite, and oversized billed costs", () => {
  for (const providerBilledCost of [-0.01, Number.POSITIVE_INFINITY, 10000000000]) {
    assert.equal(parseReconciliationInput({
      ...validBase,
      decision: "confirmed_billed",
      providerBilledCost,
      providerBilledCurrency: "USD",
      normalizedCostTwd: 10,
    }).ok, false);
  }
});

test("rejects invalid currency and missing normalized billed cost", () => {
  for (const patch of [
    { providerBilledCurrency: "usd" },
    { providerBilledCurrency: "USDT" },
    { normalizedCostTwd: undefined },
  ]) {
    assert.equal(parseReconciliationInput({
      ...validBase,
      decision: "confirmed_billed",
      providerBilledCost: 1,
      providerBilledCurrency: "USD",
      normalizedCostTwd: 1,
      ...patch,
    }).ok, false);
  }
});

test("rejects cost metadata for decisions that are not confirmed billed", () => {
  assert.equal(parseReconciliationInput({
    ...validBase,
    providerBilledCost: 0,
  }).ok, false);
});

test("rejects non-object payloads and arrays", () => {
  assert.equal(parseReconciliationInput(null).ok, false);
  assert.equal(parseReconciliationInput([]).ok, false);
});
