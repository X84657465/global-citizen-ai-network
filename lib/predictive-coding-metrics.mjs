function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(label + " must be a finite number.");
  return value;
}
function pairedSeries(predictions, observations, label) {
  if (!Array.isArray(predictions) || !Array.isArray(observations)) throw new TypeError(label + " inputs must be arrays.");
  if (predictions.length === 0 || predictions.length !== observations.length) throw new RangeError(label + " requires equally sized, non-empty arrays.");
  return Array.from({ length: predictions.length }, (_, index) => ({
    prediction: finiteNumber(predictions[index], "predictions[" + index + "]"),
    observation: finiteNumber(observations[index], "observations[" + index + "]"),
  }));
}
/** Signed residual is observed - predicted; absolute uses the same target unit. */
export function calculatePredictionError(predicted, observed) {
  const signed = finiteNumber(observed, "observed") - finiteNumber(predicted, "predicted");
  if (!Number.isFinite(signed)) throw new RangeError("prediction error exceeds the finite numeric range.");
  return { signed, absolute: Math.abs(signed) };
}
/** MAE for one homogeneous metric series. Do not mix unlike measurement units. */
export function calculateMeanAbsoluteError(predictions, observations) {
  const pairs = pairedSeries(predictions, observations, "MAE");
  let mean = 0;
  for (const [index, pair] of pairs.entries()) {
    const absoluteError = Math.abs(pair.observation - pair.prediction);
    if (!Number.isFinite(absoluteError)) {
      throw new RangeError("MAE error at index " + index + " exceeds the finite numeric range.");
    }
    mean += absoluteError / pairs.length;
  }
  if (!Number.isFinite(mean)) throw new RangeError("MAE result exceeds the finite numeric range.");
  return mean;
}
/** Binary Brier score: mean((probability - outcome) ** 2). */
export function calculateBrierScore(probabilities, outcomes) {
  const pairs = pairedSeries(probabilities, outcomes, "Brier score");
  for (const [index, pair] of pairs.entries()) {
    if (pair.prediction < 0 || pair.prediction > 1) throw new RangeError("probabilities[" + index + "] must be between 0 and 1.");
    if (pair.observation !== 0 && pair.observation !== 1) throw new RangeError("outcomes[" + index + "] must be 0 or 1.");
  }
  return pairs.reduce((sum, pair) => sum + (pair.prediction - pair.observation) ** 2, 0) / pairs.length;
}

/**
 * Expected Calibration Error (ECE) for binary probability forecasts.
 * Lower values indicate that forecast confidence better matches observed frequency.
 * ECE depends on bin count and sample size; it is a diagnostic, not a standalone
 * proof that a model is reliable or that a forecast is accurate.
 */
export function calculateExpectedCalibrationError(probabilities, outcomes, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("ECE options must be an object containing only bins.");
  }
  for (const key of Object.keys(options)) {
    if (key !== "bins") throw new TypeError("Unsupported ECE option: " + key);
  }
  const pairs = pairedSeries(probabilities, outcomes, "ECE");
  const bins = options.bins ?? 10;
  if (!Number.isSafeInteger(bins) || bins < 2 || bins > 100) {
    throw new RangeError("bins must be an integer between 2 and 100.");
  }
  const buckets = Array.from({ length: bins }, () => ({ count: 0, confidence: 0, observed: 0 }));
  for (const [index, pair] of pairs.entries()) {
    if (pair.prediction < 0 || pair.prediction > 1) {
      throw new RangeError("probabilities[" + index + "] must be between 0 and 1.");
    }
    if (pair.observation !== 0 && pair.observation !== 1) {
      throw new RangeError("outcomes[" + index + "] must be 0 or 1.");
    }
    const bucketIndex = Math.min(Math.floor(pair.prediction * bins), bins - 1);
    const bucket = buckets[bucketIndex];
    bucket.count += 1;
    bucket.confidence += pair.prediction;
    bucket.observed += pair.observation;
  }
  return buckets.reduce((total, bucket) => {
    if (bucket.count === 0) return total;
    const weight = bucket.count / pairs.length;
    const meanConfidence = bucket.confidence / bucket.count;
    const observedFrequency = bucket.observed / bucket.count;
    return total + weight * Math.abs(meanConfidence - observedFrequency);
  }, 0);
}
