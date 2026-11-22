/**
 * P — cross-workstream numeric version governance.
 * Pure validation only: this module never edits release metadata or authorizes releases.
 */
export const WORKSTREAM_IDS = Object.freeze("ABCDEFGHIJKLMNOP".split(""));
const NUMERIC_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function validVersion(value) {
  return typeof value === "string" && NUMERIC_VERSION.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate the A–P registry and the repository's duplicated release metadata.
 * The caller supplies parsed metadata so the same contract is testable without
 * filesystem access, network calls, credentials, or GitHub authority.
 */
export function validateWorkstreamVersionContract({
  manifest,
  rootVersion,
  packageVersion,
  lockfileVersion,
  lockfileRootVersion,
  readme,
  governance,
  changelog,
  pChangelog,
}) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return Object.freeze({ valid: false, errors: Object.freeze(["Manifest must be an object."]) });
  }

  if (!validVersion(manifest.overall)) errors.push("Overall version must be numeric MAJOR.MINOR.PATCH.");
  const tracks = manifest.tracks;
  if (!tracks || typeof tracks !== "object" || Array.isArray(tracks)) {
    errors.push("Manifest tracks must be an object.");
  } else {
    const actual = Object.keys(tracks).sort();
    const expected = [...WORKSTREAM_IDS].sort();
    if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
      errors.push("Manifest must define each A–P workstream exactly once and no other track keys.");
    }
    for (const id of WORKSTREAM_IDS) {
      const track = tracks[id];
      if (!track || typeof track !== "object" || !validVersion(track.version)) {
        errors.push(`Track ${id} must own a numeric MAJOR.MINOR.PATCH version.`);
      }
      if (!track || typeof track.name !== "string" || track.name.trim() === "") {
        errors.push(`Track ${id} must have a non-empty name.`);
      }
    }
  }

  const copies = [
    ["VERSION", rootVersion],
    ["package.json", packageVersion],
    ["package-lock.json version", lockfileVersion],
    ["package-lock.json packages[\"\"] root", lockfileRootVersion],
  ];
  for (const [label, version] of copies) {
    if (!validVersion(version)) errors.push(`${label} must contain a numeric MAJOR.MINOR.PATCH version.`);
    else if (validVersion(manifest.overall) && version !== manifest.overall) {
      errors.push(`${label} version must match manifest overall version ${manifest.overall}.`);
    }
  }

  const readmeRelease = typeof readme === "string"
    ? /\*\*Release:\*\* `([^`]+)` · A 線 Agent Factory V2/.exec(readme)
    : null;
  if (!readmeRelease || readmeRelease[1] !== manifest.overall) {
    errors.push("README release version must match the manifest overall version.");
  }

  const governanceBaseline = typeof governance === "string"
    ? /\*\*Repository release baseline: ([0-9.]+)\*\*/.exec(governance)
    : null;
  if (!governanceBaseline || governanceBaseline[1] !== manifest.overall) {
    errors.push("Engineering governance release baseline must match the manifest overall version.");
  }

  if (typeof changelog !== "string" || !new RegExp(`^## ${escapeRegExp(manifest.overall ?? "")} — \\d{4}-\\d{2}-\\d{2}$`, "m").test(changelog)) {
    errors.push("CHANGELOG.md must start with an entry for the manifest overall version and an ISO date.");
  }

  const pVersion = tracks?.P?.version;
  if (typeof pChangelog !== "string" || !validVersion(pVersion) ||
      !new RegExp(`^## P ${escapeRegExp(pVersion)} — \\d{4}-\\d{2}-\\d{2}$`, "m").test(pChangelog)) {
    errors.push("P workstream changelog must contain the current P version and an ISO date.");
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
