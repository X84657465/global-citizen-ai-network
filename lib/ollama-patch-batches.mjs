export function splitPatchPathsIntoBatches(paths, maxPathsPerBatch = 4) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new TypeError("Patch paths must be a non-empty array.");
  }
  if (!Number.isSafeInteger(maxPathsPerBatch) || maxPathsPerBatch < 1 || maxPathsPerBatch > 20) {
    throw new TypeError("maxPathsPerBatch must be an integer between 1 and 20.");
  }
  const seen = new Set();
  for (const path of paths) {
    if (typeof path !== "string" || path.trim().length === 0) {
      throw new TypeError("Every patch path must be a non-empty string.");
    }
    const normalized = path.toLowerCase();
    if (seen.has(normalized)) throw new TypeError("Patch paths must be unique.");
    seen.add(normalized);
  }
  const batches = [];
  for (let index = 0; index < paths.length; index += maxPathsPerBatch) {
    batches.push(paths.slice(index, index + maxPathsPerBatch));
  }
  return batches;
}
