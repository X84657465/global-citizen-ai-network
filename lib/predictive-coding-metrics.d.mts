export interface PredictionError {
  /** Signed residual in the caller's original unit: observed - predicted. */
  signed: number;
  /** Absolute residual in the caller's original unit. */
  absolute: number;
}
export function calculatePredictionError(predicted: number, observed: number): PredictionError;
export function calculateMeanAbsoluteError(predictions: number[], observations: number[]): number;
export function calculateBrierScore(probabilities: number[], outcomes: Array<0 | 1>): number;

/** Expected Calibration Error for binary probability forecasts. Lower is better. */
export function calculateExpectedCalibrationError(
  probabilities: number[],
  outcomes: Array<0 | 1>,
  options?: { bins?: number },
): number;
