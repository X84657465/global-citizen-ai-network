const SOURCE_TYPES = new Set(["primary", "secondary", "tertiary"]);
const STANCES = new Set(["supports", "contradicts", "contextualizes", "neutral"]);
const SOURCE_ID = /^SRC-[A-Z0-9][A-Z0-9-]{1,39}$/;
const CLAIM_ID = /^CLM-[A-Z0-9][A-Z0-9-]{1,39}$/;
const PUBLISHER_KEY = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const ALLOWED_KEYS = new Set([
  "source_id", "title", "url", "publisher", "publisher_key", "source_type",
  "published_at", "retrieved_at", "claim_ids", "stance", "limitations",
]);

function text(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength || /[\r\n\0]/.test(value)) {
    throw new TypeError(label + " must be non-empty text within " + maxLength + " characters.");
  }
  return value.trim();
}
function iso(value, label, optional = false) {
  if (optional && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(label + " must be a valid ISO-8601 date or null.");
  }
  return new Date(value).toISOString();
}
function safeHttpsUrl(value) {
  let parsed;
  try { parsed = new URL(text(value, "url", 2048)); }
  catch { throw new TypeError("url must be a valid absolute HTTPS URL."); }
  const host = parsed.hostname.toLowerCase();
  const privateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host);
  const privateIpv6 = /^\[(?:::1|fc[0-9a-f:]*|fd[0-9a-f:]*|fe80:[0-9a-f:]*)\]$/i.test(host);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      (parsed.port && parsed.port !== "443") ||
      host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
      privateIpv4 || privateIpv6) {
    throw new TypeError("url must be a public HTTPS reference without credentials or private-network host.");
  }
  return parsed.href;
}

/**
 * Validate and normalize a curated research source reference.
 * This function never fetches a URL or claims that its contents are authentic.
 */
export function validateResearchSourceRecord(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Research source must be an object.");
  }
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) throw new TypeError("Unsupported research source field: " + key);
  }
  const sourceId = text(input.source_id, "source_id", 44);
  if (!SOURCE_ID.test(sourceId)) throw new TypeError("source_id must use SRC-... format.");
  const title = text(input.title, "title", 300);
  const publisher = text(input.publisher, "publisher", 200);
  const publisherKey = text(input.publisher_key, "publisher_key", 80).toLowerCase();
  if (!PUBLISHER_KEY.test(publisherKey)) throw new TypeError("publisher_key must be a stable lowercase identity key.");
  if (!SOURCE_TYPES.has(input.source_type)) throw new TypeError("source_type must be primary, secondary or tertiary.");
  if (!STANCES.has(input.stance)) throw new TypeError("stance must be supports, contradicts, contextualizes or neutral.");
  if (!Array.isArray(input.claim_ids) || input.claim_ids.length < 1 || input.claim_ids.length > 30) {
    throw new RangeError("claim_ids must contain between 1 and 30 claim IDs.");
  }
  const claimIds = input.claim_ids.map((value, index) => {
    const claimId = text(value, "claim_ids[" + index + "]", 44);
    if (!CLAIM_ID.test(claimId)) throw new TypeError("claim_ids[" + index + "] must use CLM-... format.");
    return claimId;
  });
  if (new Set(claimIds).size !== claimIds.length) throw new TypeError("claim_ids must not contain duplicates.");
  if (input.limitations !== undefined && (!Array.isArray(input.limitations) || input.limitations.length > 12)) {
    throw new RangeError("limitations must be an array with at most 12 items.");
  }
  const limitations = (input.limitations ?? []).map((value, index) => text(value, "limitations[" + index + "]", 300));
  return {
    source_id: sourceId,
    title,
    url: safeHttpsUrl(input.url),
    publisher,
    publisher_key: publisherKey,
    source_type: input.source_type,
    published_at: iso(input.published_at, "published_at", true),
    retrieved_at: iso(input.retrieved_at, "retrieved_at"),
    claim_ids: claimIds,
    stance: input.stance,
    limitations,
  };
}

/**
 * Assess one claim without inventing a numeric trust score.
 * Publisher keys must be curated consistently; multiple URLs from one publisher
 * count as one publisher, not multiple independent corroborating sources.
 */
export function assessClaimEvidence(claimId, sourceRecords) {
  const targetClaim = text(claimId, "claimId", 44);
  if (!CLAIM_ID.test(targetClaim)) throw new TypeError("claimId must use CLM-... format.");
  if (!Array.isArray(sourceRecords)) throw new TypeError("sourceRecords must be an array.");
  const sources = sourceRecords.map(validateResearchSourceRecord);
  const ids = sources.map((source) => source.source_id);
  if (new Set(ids).size !== ids.length) throw new TypeError("source_id values must be unique.");
  const related = sources.filter((source) => source.claim_ids.includes(targetClaim));
  const supporting = related.filter((source) => source.stance === "supports");
  const contradicting = related.filter((source) => source.stance === "contradicts");
  const contextualizing = related.filter((source) => source.stance === "contextualizes");
  const supportingPublishers = new Set(supporting.map((source) => source.publisher_key));
  const contradictingPublishers = new Set(contradicting.map((source) => source.publisher_key));
  const independentContradictingPublishers = [...contradictingPublishers]
    .filter((publisher) => !supportingPublishers.has(publisher));
  const selfConflictedPublishers = [...supportingPublishers]
    .filter((publisher) => contradictingPublishers.has(publisher));
  let status = "insufficient";
  if (supportingPublishers.size > 0 && independentContradictingPublishers.length > 0) status = "contested";
  else if (supportingPublishers.size >= 2) status = "corroborated";
  else if (supportingPublishers.size === 1) status = "single-source";
  else if (contradictingPublishers.size > 0) status = "counter-evidence-only";
  return {
    claim_id: targetClaim,
    status,
    related_source_count: related.length,
    supporting_source_ids: supporting.map((source) => source.source_id),
    contradicting_source_ids: contradicting.map((source) => source.source_id),
    contextualizing_source_ids: contextualizing.map((source) => source.source_id),
    independent_supporting_publishers: supportingPublishers.size,
    independent_contradicting_publishers: independentContradictingPublishers.length,
    self_conflicted_publishers: selfConflictedPublishers,
    counter_evidence_required: supportingPublishers.size > 0 && independentContradictingPublishers.length === 0,
  };
}
