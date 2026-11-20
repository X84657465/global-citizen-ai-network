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
  if (typeof value !== "string" || !value.trim() || value.length > maxLength || /[\r\n\0]/.test(value)) {
    throw new TypeError(label + " must be non-empty text within " + maxLength + " characters.");
  }
  return value.trim();
}
function iso(value, label, optional = false) {
  if (optional && (value === null || value === undefined || value === "")) return null;
  const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/;
  const match = typeof value === "string" ? timestampPattern.exec(value) : null;
  if (!match || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(label + " must be a valid timezone-qualified ISO-8601 timestamp or null.");
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  calendarDate.setUTCHours(0, 0, 0, 0);
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 ||
      calendarDate.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59 ||
      offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
    throw new TypeError(label + " must be a valid timezone-qualified ISO-8601 timestamp or null.");
  }
  return new Date(value).toISOString();
}
function isNonPublicIpv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [a, b, c] = parts.map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113);
}
function isNonPublicIpv6(host) {
  const [firstText = "", secondText = ""] = host.split(":");
  const firstHextet = firstText ? Number.parseInt(firstText, 16) : 0;
  const secondHextet = secondText ? Number.parseInt(secondText, 16) : 0;
  if (!Number.isInteger(firstHextet) || !Number.isInteger(secondHextet)) return true;

  // Only accept global-unicast 2000::/3 literals. This rejects unspecified,
  // loopback, IPv4-compatible/mapped, ULA, link-local, site-local and multicast
  // ranges, including compressed IPv4-compatible forms such as ::c0a8:101.
  if (firstHextet < 0x2000 || firstHextet > 0x3fff) return true;

  // Exclude special-purpose/documentation blocks and transition mechanisms
  // that must not be treated as ordinary public research destinations.
  return (firstHextet === 0x2001 && secondHextet <= 0x01ff) ||
    (firstHextet === 0x3fff && secondHextet <= 0x0fff) ||
    /^2002:/i.test(host) ||
    /^2001:db8:/i.test(host);
}
function safeHttpsUrl(value) {
  let parsed;
  try { parsed = new URL(text(value, "url", 2048)); }
  catch { throw new TypeError("url must be a valid absolute HTTPS URL."); }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const isIpLiteral = host.includes(":") || /^\d+(?:\.\d+){3}$/.test(host);
  const blockedHost = host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal") ||
    (isIpLiteral && (isNonPublicIpv4(host) || isNonPublicIpv6(host)));
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      (parsed.port && parsed.port !== "443") || blockedHost) {
    throw new TypeError("url must be a public HTTPS reference without credentials or non-public host literals.");
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
