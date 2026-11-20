import test from "node:test";
import assert from "node:assert/strict";
import { calculateBrierScore, calculateMeanAbsoluteError, calculatePredictionError } from "../lib/predictive-coding-metrics.mjs";

test("uses observed minus predicted as the signed residual", () => {
  assert.deepEqual(calculatePredictionError(92, 88), { signed: -4, absolute: 4 });
  assert.deepEqual(calculatePredictionError(14, 18), { signed: 4, absolute: 4 });
  assert.deepEqual(calculatePredictionError(10, 10), { signed: 0, absolute: 0 });
});
test("rejects non-finite and non-numeric prediction values", () => {
  for (const value of [NaN, Infinity, -Infinity, "12", null]) {
    assert.throws(() => calculatePredictionError(value, 1), /finite number/);
    assert.throws(() => calculatePredictionError(1, value), /finite number/);
  }
});
test("calculates MAE only for equally sized non-empty homogeneous series", () => {
  assert.equal(calculateMeanAbsoluteError([92, 80, 75], [88, 84, 75]), 8 / 3);
  assert.throws(() => calculateMeanAbsoluteError([], []), /non-empty arrays/);
  assert.throws(() => calculateMeanAbsoluteError([1], [1, 2]), /equally sized/);
  assert.throws(() => calculateMeanAbsoluteError([1, NaN], [1, 2]), /finite number/);
  assert.throws(() => calculateMeanAbsoluteError("1", [1]), /must be arrays/);
});
test("calculates the binary Brier score", () => {
  assert.equal(calculateBrierScore([0.9, 0.2], [1, 0]), 0.025);
  assert.equal(calculateBrierScore([0, 1], [0, 1]), 0);
});
test("rejects probabilities outside zero to one and non-binary outcomes", () => {
  assert.throws(() => calculateBrierScore([-0.01], [0]), /between 0 and 1/);
  assert.throws(() => calculateBrierScore([1.01], [1]), /between 0 and 1/);
  assert.throws(() => calculateBrierScore([0.5], [0.5]), /0 or 1/);
  assert.throws(() => calculateBrierScore([], []), /non-empty arrays/);
});
