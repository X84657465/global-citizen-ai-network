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

export function selectPatchBatchSourceFiles(fileContext, batchPaths) {
  if (!Array.isArray(fileContext)) throw new TypeError("File context must be an array.");
  if (!Array.isArray(batchPaths) || batchPaths.length === 0) {
    throw new TypeError("Batch paths must be a non-empty array.");
  }

  const contextByPath = new Map();
  for (const file of fileContext) {
    if (!file || typeof file.path !== "string" || file.path.trim().length === 0) {
      throw new TypeError("Every file context entry must have a path.");
    }
    const normalized = file.path.toLowerCase();
    if (contextByPath.has(normalized)) {
      throw new TypeError("File context paths must be unique.");
    }
    contextByPath.set(normalized, file);
  }

  const selected = [];
  for (const path of batchPaths) {
    if (typeof path !== "string" || path.trim().length === 0) {
      throw new TypeError("Every batch path must be a non-empty string.");
    }
    const file = contextByPath.get(path.toLowerCase());
    if (!file) throw new Error("Missing source context for approved patch path: " + path);
    selected.push(file);
  }
  return selected;
}


export const MIN_PATCH_OUTPUT_TOKENS = 16384;
export const MAX_PATCH_OUTPUT_TOKENS = 24576;

export function calculatePatchOutputTokenBudget(sourceBytes) {
  if (!Number.isSafeInteger(sourceBytes) || sourceBytes < 0) {
    throw new TypeError("sourceBytes must be a non-negative safe integer.");
  }
  return Math.min(
    MAX_PATCH_OUTPUT_TOKENS,
    Math.max(MIN_PATCH_OUTPUT_TOKENS, Math.ceil(sourceBytes / 0.75)),
  );
}
