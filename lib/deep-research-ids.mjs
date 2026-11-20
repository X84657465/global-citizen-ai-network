/**
 * Returns the next monotonically increasing research ID from the current records.
 * The caller owns persistence; this helper only creates a deterministic local ID.
 */
export function nextResearchProjectId(existingIds) {
  if (!Array.isArray(existingIds)) throw new TypeError("existingIds must be an array.");
  const used = new Set();
  const usedNumbers = new Set();
  let highest = 23;
  for (const [index, id] of existingIds.entries()) {
    if (typeof id !== "string") throw new TypeError("existingIds[" + index + "] must be a string.");
    const match = /^DR-(\d{3,})$/.exec(id);
    if (!match) throw new TypeError("existingIds[" + index + "] must use the DR-NNN format.");
    const numeric = Number(match[1]);
    if (!Number.isSafeInteger(numeric) || numeric < 1) throw new RangeError("Research project ID is outside the safe numeric range.");
    if (usedNumbers.has(numeric)) {
      throw new TypeError("existingIds contains duplicate numeric research ID: DR-" + String(numeric).padStart(3, "0") + ".");
    }
    used.add(id);
    usedNumbers.add(numeric);
    highest = Math.max(highest, numeric);
  }
  let candidate = highest + 1;
  if (!Number.isSafeInteger(candidate)) throw new RangeError("No safe research project ID remains.");
  let next = "DR-" + String(candidate).padStart(3, "0");
  while (used.has(next)) {
    candidate += 1;
    if (!Number.isSafeInteger(candidate)) throw new RangeError("No safe research project ID remains.");
    next = "DR-" + String(candidate).padStart(3, "0");
  }
  return next;
}
