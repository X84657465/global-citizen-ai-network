import test from "node:test";
import assert from "node:assert/strict";
import { isValidIdempotencyKey } from "../lib/ai/idempotency.ts";

test("accepts valid idempotency keys at the minimum and maximum lengths", () => {
  assert.equal(isValidIdempotencyKey("12345678"), true);
  assert.equal(isValidIdempotencyKey("a".repeat(128)), true);
});

test("rejects missing, short, long, or whitespace-padded keys", () => {
  assert.equal(isValidIdempotencyKey(null), false);
  assert.equal(isValidIdempotencyKey(undefined), false);
  assert.equal(isValidIdempotencyKey("1234567"), false);
  assert.equal(isValidIdempotencyKey("a".repeat(129)), false);
  assert.equal(isValidIdempotencyKey(" 12345678"), false);
  assert.equal(isValidIdempotencyKey("12345678 "), false);
});

test("rejects characters outside the documented idempotency-key alphabet", () => {
  for (const value of ["1234567/8", "1234567?8", "1234567 8", "1234567#8"]) {
    assert.equal(isValidIdempotencyKey(value), false);
  }
  assert.equal(isValidIdempotencyKey("key_1234.A-b:c"), true);
});
