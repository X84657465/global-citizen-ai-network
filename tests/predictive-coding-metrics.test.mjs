import test from "node:test";
import assert from "node:assert/strict";
import { calculateBrierScore, calculateExpectedCalibrationError, calculateMeanAbsoluteError, calculatePredictionError } from "../lib/predictive-coding-metrics.mjs";

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

test("calculates weighted Expected Calibration Error across probability bins", () => {
  // Low-confidence group: mean probability 0.25, observed frequency 0.00.
  // High-confidence group: mean probability 0.85, observed frequency 1.00.
  assert.ok(Math.abs(calculateExpectedCalibrationError([0.2, 0.3, 0.8, 0.9], [0, 0, 1, 1], { bins: 2 }) - 0.2) < 1e-12);
});
test("handles the exact-one probability boundary in the final calibration bin", () => {
  assert.equal(calculateExpectedCalibrationError([1, 1, 0, 0], [1, 1, 0, 0], { bins: 2 }), 0);
  assert.equal(calculateExpectedCalibrationError([0, 0, 1, 1], [0, 0, 1, 1], { bins: 10 }), 0);
});
test("rejects malformed ECE option containers and unknown option keys", () => {
  for (const options of [null, [], "10", 10]) {
    assert.throws(() => calculateExpectedCalibrationError([0.5], [1], options), /ECE options must be a plain object/);
  }
  assert.throws(() => calculateExpectedCalibrationError([0.5], [1], { bin: 2 }), /Unsupported ECE option: bin/);
  assert.throws(() => calculateExpectedCalibrationError([0.5], [1], { bins: 2, strategy: "quantile" }), /Unsupported ECE option: strategy/);
});

test("rejects malformed ECE arrays, probabilities, outcomes and bin counts", () => {
  assert.throws(() => calculateExpectedCalibrationError([], [], { bins: 10 }), /non-empty arrays/);
  assert.throws(() => calculateExpectedCalibrationError([0.2], [0, 1]), /equally sized/);
  assert.throws(() => calculateExpectedCalibrationError([-0.1], [0]), /between 0 and 1/);
  assert.throws(() => calculateExpectedCalibrationError([1.1], [1]), /between 0 and 1/);
  assert.throws(() => calculateExpectedCalibrationError([0.5], [0.5]), /0 or 1/);
  for (const bins of [1, 101, 2.5, NaN, "10"]) {
    assert.throws(() => calculateExpectedCalibrationError([0.5], [1], { bins }), /bins must be an integer/);
  }
});

test("rejects arithmetic overflow instead of emitting infinite prediction errors", () => {
  assert.throws(() => calculatePredictionError(-1e308, 1e308), /exceeds the finite numeric range/);
  assert.throws(() => calculateMeanAbsoluteError([-1e308], [1e308]), /exceeds the finite numeric range/);
});

test("computes large finite MAE values without overflowing an intermediate sum", () => {
  assert.equal(calculateMeanAbsoluteError([0, 0], [1e308, 1e308]), 1e308);
});


test("rejects sparse prediction and observation arrays instead of silently skipping missing samples", () => {
  const sparsePrediction = new Array(2);
  const sparseObservation = [0, 1];
  const sparseOutcome = new Array(2);
  const denseProbability = [0.2, 0.8];

  assert.throws(() => calculateMeanAbsoluteError(sparsePrediction, sparseObservation), /finite number/);
  assert.throws(() => calculateBrierScore(sparsePrediction, sparseObservation), /finite number/);
  assert.throws(() => calculateExpectedCalibrationError(sparsePrediction, sparseObservation), /finite number/);
  assert.throws(() => calculateMeanAbsoluteError(denseProbability, sparseOutcome), /finite number/);
  assert.throws(() => calculateBrierScore(denseProbability, sparseOutcome), /finite number/);
  assert.throws(() => calculateExpectedCalibrationError(denseProbability, sparseOutcome), /finite number/);
});

test("ECE rejects inherited, symbol, non-enumerable and accessor option keys", () => {
  const inherited = Object.create({ bins: 2 });
  assert.throws(() => calculateExpectedCalibrationError([0.2], [0], inherited), /plain object/);

  const symbolOption = { bins: 2, [Symbol("unexpected")]: true };
  assert.throws(() => calculateExpectedCalibrationError([0.2], [0], symbolOption), /Unsupported ECE option/);

  const hiddenOption = {};
  Object.defineProperty(hiddenOption, "unexpected", { value: true, enumerable: false });
  assert.throws(() => calculateExpectedCalibrationError([0.2], [0], hiddenOption), /Unsupported ECE option/);

  const accessorOption = {};
  Object.defineProperty(accessorOption, "bins", { get() { throw new Error("getter must not execute"); } });
  assert.throws(() => calculateExpectedCalibrationError([0.2], [0], accessorOption), /data property/);
});
