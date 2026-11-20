const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const ROOT_KEYS = new Set(["schemaVersion", "repository", "track", "pullRequestNumber", "baseSha", "headSha", "generatedAt", "checks"]);
const CHECK_KEYS = new Set(["name", "conclusion", "headSha", "runId", "runAttempt"]);

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function validTimestamp(value) {
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19);
}

/**
 * Validate immutable release evidence. This is a pure contract validator:
 * it does not fetch GitHub state or independently authenticate a workflow run.
 */
export function validateReleaseEvidence(evidence, options = {}) {
  const errors = [];
  if (!isPlainRecord(evidence)) return { valid: false, errors: ["evidence must be a plain object"] };

  if (!hasOnlyKeys(evidence, ROOT_KEYS)) errors.push("evidence contains unsupported root fields");
  if (evidence.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
  if (typeof evidence.repository !== "string" || !REPOSITORY_PATTERN.test(evidence.repository)) {
    errors.push("repository must use owner/repository format");
  }
  if (options.expectedRepository && evidence.repository !== options.expectedRepository) {
    errors.push("repository does not match the expected repository");
  }
  if (typeof evidence.track !== "string" || !/^[A-P]$/.test(evidence.track)) {
    errors.push("track must be one uppercase letter from A through P");
  }
  if (!Number.isSafeInteger(evidence.pullRequestNumber) || evidence.pullRequestNumber < 1) {
    errors.push("pullRequestNumber must be a positive safe integer");
  }
  if (typeof evidence.baseSha !== "string" || !SHA_PATTERN.test(evidence.baseSha)) {
    errors.push("baseSha must be a 40-character commit SHA");
  }
  if (typeof evidence.headSha !== "string" || !SHA_PATTERN.test(evidence.headSha)) {
    errors.push("headSha must be a 40-character commit SHA");
  }
  if (options.expectedHeadSha && evidence.headSha !== options.expectedHeadSha) {
    errors.push("headSha does not match the expected tested commit");
  }
  if (!validTimestamp(evidence.generatedAt)) errors.push("generatedAt must be a valid timezone-qualified ISO timestamp");

  if (!Array.isArray(evidence.checks) || evidence.checks.length === 0) {
    errors.push("checks must be a non-empty array");
  } else {
    const names = new Set();
    for (let index = 0; index < evidence.checks.length; index += 1) {
      const check = evidence.checks[index];
      const prefix = "checks[" + index + "]";
      if (!isPlainRecord(check)) {
        errors.push(prefix + " must be a plain object");
        continue;
      }
      if (!hasOnlyKeys(check, CHECK_KEYS)) errors.push(prefix + " contains unsupported fields");
      if (typeof check.name !== "string" || check.name.trim().length === 0 || check.name.length > 120) {
        errors.push(prefix + ".name must be a non-empty string of at most 120 characters");
      } else if (names.has(check.name)) {
        errors.push(prefix + ".name must be unique");
      } else {
        names.add(check.name);
      }
      if (check.conclusion !== "success") errors.push(prefix + ".conclusion must be success");
      if (typeof check.headSha !== "string" || !SHA_PATTERN.test(check.headSha)) {
        errors.push(prefix + ".headSha must be a 40-character commit SHA");
      } else if (check.headSha !== evidence.headSha) {
        errors.push(prefix + ".headSha must equal the evidence headSha");
      }
      if (!Number.isSafeInteger(check.runId) || check.runId < 1) {
        errors.push(prefix + ".runId must be a positive safe integer");
      }
      if (!Number.isSafeInteger(check.runAttempt) || check.runAttempt < 1) {
        errors.push(prefix + ".runAttempt must be a positive safe integer");
      }
    }
    for (const requiredName of options.requiredChecks ?? []) {
      if (!names.has(requiredName)) errors.push("required check is missing: " + requiredName);
    }
  }

  return { valid: errors.length === 0, errors };
}
