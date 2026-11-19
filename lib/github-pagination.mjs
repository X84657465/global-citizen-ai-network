export async function collectGitHubPages(fetchPage, { pageSize = 100, maxPages = 10 } = {}) {
  if (typeof fetchPage !== "function") throw new TypeError("fetchPage must be a function.");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new TypeError("pageSize must be a positive integer.");
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) throw new TypeError("maxPages must be a positive integer.");

  const collected = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await fetchPage(page);
    if (!Array.isArray(batch)) throw new Error("GitHub paginated response has an unexpected shape.");
    collected.push(...batch);
    if (batch.length < pageSize) return collected;
  }
  throw new Error("GitHub pagination reached the " + maxPages + "-page safety limit; refusing incomplete results.");
}
