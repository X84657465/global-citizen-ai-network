function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(label + " must be a finite number.");
  return value;
}
function pairedSeries(predictions, observations, label) {
  if (!Array.isArray(predictions) || !Array.isArray(observations)) throw new TypeError(label + " inputs must be arrays.");
  if (predictions.length === 0 || predictions.length !== observations.length) throw new RangeError(label + " requires equally sized, non-empty arrays.");
  return predictions.map((prediction, index) => ({
    prediction: finiteNumber(prediction, "predictions[" + index + "]"),
    observation: finiteNumber(observations[index], "observations[" + index + "]"),
  }));
}
/** Signed residual is observed - predicted; absolute uses the same target unit. */
export function calculatePredictionError(predicted, observed) {
  const signed = finiteNumber(observed, "observed") - finiteNumber(predicted, "predicted");
  return { signed, absolute: Math.abs(signed) };
}
/** MAE for one homogeneous metric series. Do not mix unlike measurement units. */
export function calculateMeanAbsoluteError(predictions, observations) {
  const pairs = pairedSeries(predictions, observations, "MAE");
  return pairs.reduce((sum, pair) => sum + Math.abs(pair.observation - pair.prediction), 0) / pairs.length;
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
