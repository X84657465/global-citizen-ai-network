const TRACKS = new Set(["A", "B", "C", "D", "E"]);
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const RISK = new Set(["low", "medium", "high", "critical"]);
const JSON_SCHEMA_TYPES = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);
const SENSITIVITY = new Set(["public", "internal", "restricted"]);
const REVIEW = new Set(["pending", "approved", "rejected"]);

export class DeepNeuralContractError extends TypeError {
  constructor(message) {
    super(message);
    this.name = "DeepNeuralContractError";
  }
}

function fail(message) {
  throw new DeepNeuralContractError(message);
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label + " must be an object.");
  return value;
}


function plainSchemaRecord(value, label) {
  record(value, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(label + " must be a plain JSON Schema object.");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") fail(label + " must not contain symbol keys.");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      fail(label + " must not contain accessor properties.");
    }
  }
  return value;
}

function text(value, label, max = 512) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    fail(label + " must be a non-empty string no longer than " + max + " characters.");
  }
  return value.trim();
}

function enumValue(value, values, label) {
  if (!values.has(value)) fail(label + " has an unsupported value.");
  return value;
}

function version(value, label = "version") {
  if (typeof value !== "string" || !SEMVER.test(value)) fail(label + " must use numeric MAJOR.MINOR.PATCH.");
  return value;
}

function isoDate(value, label) {
  const pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/;
  const match = typeof value === "string" ? pattern.exec(value) : null;
  if (!match || !Number.isFinite(Date.parse(value))) {
    fail(label + " must be a valid timezone-qualified ISO-8601 timestamp.");
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59 ||
      offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
    fail(label + " must be a valid timezone-qualified ISO-8601 timestamp.");
  }
  return value;
}

function stringList(value, label, { min = 1, max = 20, itemLength = 512 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(label + " must contain between " + min + " and " + max + " items.");
  }
  const normalized = value.map((item, index) => text(item, label + "[" + index + "]", itemLength));
  if (new Set(normalized).size !== normalized.length) fail(label + " must not contain duplicates.");
  return normalized;
}

function onlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(label + " contains unsupported field: " + key + ".");
  }
}

function safeRef(value, label) {
  const result = text(value, label, 1024);
  if (/^(?:data:|javascript:|file:)/i.test(result)) fail(label + " must not use an executable or embedded-data URI.");
  return result;
}

export function validateKnowledgeArtifact(input) {
  const value = record(input, "KnowledgeArtifact");
  onlyKeys(value, new Set(["artifact_id", "version", "track", "kind", "content_ref", "provenance", "confidence", "sensitivity", "created_at", "review_status", "expires_at"]), "KnowledgeArtifact");
  const provenance = record(value.provenance, "provenance");
  onlyKeys(provenance, new Set(["source_type", "source_ref", "commit_sha", "reviewed", "reviewer"]), "provenance");
  const sourceTypes = new Set(["git", "test", "human_review", "external", "user_input"]);
  if (typeof provenance.reviewed !== "boolean") fail("provenance.reviewed must be boolean.");
  if (provenance.commit_sha !== undefined && (typeof provenance.commit_sha !== "string" || !SHA.test(provenance.commit_sha))) {
    fail("provenance.commit_sha must be a 40- or 64-character hexadecimal SHA.");
  }
  if (value.confidence !== undefined && (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1)) {
    fail("confidence must be a finite number between 0 and 1.");
  }
  const createdAt = isoDate(value.created_at, "created_at");
  const expiresAt = value.expires_at === undefined ? undefined : isoDate(value.expires_at, "expires_at");
  if (expiresAt && Date.parse(expiresAt) <= Date.parse(createdAt)) fail("expires_at must be later than created_at.");
  if (provenance.reviewed && !provenance.reviewer) fail("A reviewed artifact requires a reviewer.");
  if (value.review_status === "approved" && !provenance.reviewed) fail("An approved artifact must have reviewed provenance.");
  return {
    artifact_id: text(value.artifact_id, "artifact_id", 128),
    version: version(value.version),
    track: enumValue(value.track, TRACKS, "track"),
    kind: enumValue(value.kind, new Set(["episodic", "semantic", "procedural"]), "kind"),
    content_ref: safeRef(value.content_ref, "content_ref"),
    provenance: {
      source_type: enumValue(provenance.source_type, sourceTypes, "provenance.source_type"),
      source_ref: safeRef(provenance.source_ref, "provenance.source_ref"),
      ...(provenance.commit_sha ? { commit_sha: provenance.commit_sha.toLowerCase() } : {}),
      reviewed: provenance.reviewed,
      ...(provenance.reviewer ? { reviewer: text(provenance.reviewer, "provenance.reviewer", 128) } : {}),
    },
    ...(value.confidence === undefined ? {} : { confidence: value.confidence }),
    sensitivity: enumValue(value.sensitivity, SENSITIVITY, "sensitivity"),
    created_at: createdAt,
    review_status: enumValue(value.review_status, REVIEW, "review_status"),
    ...(expiresAt ? { expires_at: expiresAt } : {}),
  };
}

export function validateEvidenceRecord(input) {
  const value = record(input, "EvidenceRecord");
  onlyKeys(value, new Set(["repository", "branch", "commit_sha", "command", "result", "run_url", "timestamp"]), "EvidenceRecord");
  if (typeof value.commit_sha !== "string" || !SHA.test(value.commit_sha)) fail("commit_sha must be a 40- or 64-character hexadecimal SHA.");
  if (!["pass", "fail", "unknown"].includes(value.result)) fail("result must be pass, fail or unknown.");
  const runUrl = value.run_url === undefined ? undefined : safeRef(value.run_url, "run_url");
  if (runUrl !== undefined && !/^https:\/\/(?:github\.com|api\.github\.com)\//i.test(runUrl)) {
    fail("run_url must point to GitHub over HTTPS.");
  }
  return {
    repository: text(value.repository, "repository", 200),
    branch: text(value.branch, "branch", 255),
    commit_sha: value.commit_sha.toLowerCase(),
    command: text(value.command, "command", 1000),
    result: value.result,
    ...(runUrl ? { run_url: runUrl } : {}),
    timestamp: isoDate(value.timestamp, "timestamp"),
  };
}

export function validateCapabilityManifest(input) {
  const value = record(input, "CapabilityManifest");
  onlyKeys(value, new Set(["capability_id", "version", "input_schema", "output_schema", "permissions", "risk_class", "tests"]), "CapabilityManifest");
  const inputSchema = plainSchemaRecord(value.input_schema, "input_schema");
  const outputSchema = plainSchemaRecord(value.output_schema, "output_schema");
  const inputType = Object.getOwnPropertyDescriptor(inputSchema, "type");
  const outputType = Object.getOwnPropertyDescriptor(outputSchema, "type");
  if (!inputType || !Object.prototype.hasOwnProperty.call(inputType, "value") ||
      !outputType || !Object.prototype.hasOwnProperty.call(outputType, "value") ||
      typeof inputType.value !== "string" || typeof outputType.value !== "string") {
    fail("Capability schemas require an explicit type.");
  }
  if (!JSON_SCHEMA_TYPES.has(inputType.value) || !JSON_SCHEMA_TYPES.has(outputType.value)) {
    fail("Capability schemas require a supported JSON Schema type.");
  }
  const permissions = stringList(value.permissions, "permissions", { min: 0, max: 20, itemLength: 100 });
  if (permissions.some((permission) => !/^[a-z][a-z0-9:_-]*$/.test(permission))) fail("permissions contains an invalid capability token.");
  return {
    capability_id: text(value.capability_id, "capability_id", 128),
    version: version(value.version),
    input_schema: inputSchema,
    output_schema: outputSchema,
    permissions,
    risk_class: enumValue(value.risk_class, RISK, "risk_class"),
    tests: stringList(value.tests, "tests", { min: 1, max: 50, itemLength: 240 }),
  };
}

export function validateLearningProposal(input) {
  const value = record(input, "LearningProposal");
  onlyKeys(value, new Set(["source_evidence", "proposed_rule", "affected_tracks", "expected_benefit", "risks", "validation_plan", "decision"]), "LearningProposal");
  const affectedTracks = stringList(value.affected_tracks, "affected_tracks", { min: 1, max: 5, itemLength: 1 });
  if (affectedTracks.some((track) => !TRACKS.has(track))) fail("affected_tracks contains an unknown track.");
  return {
    source_evidence: stringList(value.source_evidence, "source_evidence", { min: 1, max: 30 }),
    proposed_rule: text(value.proposed_rule, "proposed_rule", 3000),
    affected_tracks: affectedTracks,
    expected_benefit: text(value.expected_benefit, "expected_benefit", 1500),
    risks: text(value.risks, "risks", 1500),
    validation_plan: stringList(value.validation_plan, "validation_plan", { min: 1, max: 20, itemLength: 1000 }),
    decision: enumValue(value.decision, new Set(["pending", "accepted", "rejected"]), "decision"),
  };
}

export function validateEvaluationResult(input) {
  const value = record(input, "EvaluationResult");
  onlyKeys(value, new Set(["target_version", "criteria", "evidence_refs", "outcome", "reviewer"]), "EvaluationResult");
  const outcome = enumValue(value.outcome, new Set(["pass", "fail", "unknown"]), "outcome");
  if (outcome === "pass" && (!Array.isArray(value.evidence_refs) || value.evidence_refs.length === 0)) {
    fail("A passing evaluation requires evidence references.");
  }
  return {
    target_version: version(value.target_version, "target_version"),
    criteria: stringList(value.criteria, "criteria", { min: 1, max: 30, itemLength: 1000 }),
    evidence_refs: stringList(value.evidence_refs, "evidence_refs", { min: 0, max: 50 }),
    outcome,
    ...(value.reviewer ? { reviewer: text(value.reviewer, "reviewer", 128) } : {}),
  };
}

const RESEARCH_SOURCE_TYPES = new Set(["primary", "secondary", "tertiary"]);
const RESEARCH_STANCES = new Set(["supports", "contradicts", "contextualizes", "neutral"]);
const SOURCE_ID_PATTERN = /^SRC-[A-Z0-9][A-Z0-9-]{1,39}$/;
const CLAIM_ID_PATTERN = /^CLM-[A-Z0-9][A-Z0-9-]{1,39}$/;
const PUBLISHER_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{1,79}$/;

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
  return host === "::" || host === "::1" ||
    /^f[cd]/i.test(host) || /^fe[89ab]/i.test(host) ||
    /^ff/i.test(host) || /^::ffff:/i.test(host) ||
    /^2002:/i.test(host) || /^2001:db8:/i.test(host);
}

function safeResearchSourceUrl(value) {
  let url;
  try { url = new URL(text(value, "url", 2048)); }
  catch { fail("url must be a valid absolute HTTPS URL."); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const isIpLiteral = host.includes(":") || /^\d+(?:\.\d+){3}$/.test(host);
  const blockedHost = host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal") ||
    (isIpLiteral && (isNonPublicIpv4(host) || isNonPublicIpv6(host)));
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || blockedHost) {
    fail("url must be a public HTTPS reference without credentials or private-network host.");
  }
  return url.href;
}

/** Validates Track E's source-provenance contract without fetching the URL. */
export function validateResearchSourceRecord(input) {
  const value = record(input, "ResearchSourceRecord");
  onlyKeys(value, new Set([
    "source_id", "title", "url", "publisher", "publisher_key", "source_type",
    "published_at", "retrieved_at", "claim_ids", "stance", "limitations",
  ]), "ResearchSourceRecord");
  const sourceId = text(value.source_id, "source_id", 44);
  if (!SOURCE_ID_PATTERN.test(sourceId)) fail("source_id must use SRC-... format.");
  const publisherKey = text(value.publisher_key, "publisher_key", 80).toLowerCase();
  if (!PUBLISHER_KEY_PATTERN.test(publisherKey)) fail("publisher_key must be a stable lowercase identity key.");
  const claimIds = stringList(value.claim_ids, "claim_ids", { min: 1, max: 30, itemLength: 44 });
  if (claimIds.some((claimId) => !CLAIM_ID_PATTERN.test(claimId))) fail("claim_ids contains an invalid claim ID.");
  const limitations = value.limitations === undefined
    ? []
    : stringList(value.limitations, "limitations", { min: 0, max: 12, itemLength: 300 });
  const publishedAt = value.published_at === undefined || value.published_at === null
    ? null
    : isoDate(value.published_at, "published_at");
  return {
    source_id: sourceId,
    title: text(value.title, "title", 300),
    url: safeResearchSourceUrl(value.url),
    publisher: text(value.publisher, "publisher", 200),
    publisher_key: publisherKey,
    source_type: enumValue(value.source_type, RESEARCH_SOURCE_TYPES, "source_type"),
    published_at: publishedAt,
    retrieved_at: isoDate(value.retrieved_at, "retrieved_at"),
    claim_ids: claimIds,
    stance: enumValue(value.stance, RESEARCH_STANCES, "stance"),
    limitations,
  };
}
