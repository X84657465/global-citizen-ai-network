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

function firstNonEmptyLine(content) {
  if (typeof content !== "string") return null;
  return content.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? null;
}

function firstSectionHeading(content) {
  if (typeof content !== "string") return null;
  let fenceCharacter = null;
  let fenceLength = 0;
  for (const line of content.split(/\r?\n/)) {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fenceCharacter) {
      const closingFence = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (closingFence && closingFence[1][0] === fenceCharacter && closingFence[1].length >= fenceLength) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      continue;
    }
    if (fence) {
      fenceCharacter = fence[1][0];
      fenceLength = fence[1].length;
      continue;
    }
    if (/^ {0,3}##\s/.test(line)) return line.trim();
  }
  return null;
}

function isDatedVersionHeading(line, version, trackId, optionalTrackLabel = false) {
  if (typeof line !== "string" || !validVersion(version)) return false;
  const trackLabel = trackId ? (optionalTrackLabel ? "(?:" + trackId + " )?" : trackId + " ") : "";
  const match = new RegExp("^## " + trackLabel + escapeRegExp(version) + " — (\\d{4})-(\\d{2})-(\\d{2})$").exec(line);
  if (!match) return false;
  const dateText = match.slice(1, 4).join("-");
  const date = new Date(dateText + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateText;
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
  workstreams,
  changelog,
  pChangelog,
  trackChangelogs,
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

  const workstreamsBaseline = typeof workstreams === "string"
    ? /\*\*Planning baseline:\*\* repository release ([0-9.]+)/.exec(workstreams)
    : null;
  if (!workstreamsBaseline || workstreamsBaseline[1] !== manifest.overall) {
    errors.push("Engineering workstream planning baseline must match the manifest overall version.");
  }

  if (!isDatedVersionHeading(firstNonEmptyLine(changelog), manifest.overall)) {
    errors.push("CHANGELOG.md must start with its current version and a valid ISO date.");
  }

  for (const [id, label, pattern] of [
    ["H", "H 線 Observability", /H 線 Observability `([^`]+)`/],
    ["P", "P 線 Governance", /P 線 Governance `([^`]+)`/],
  ]) {
    const displayed = typeof readme === "string" ? pattern.exec(readme) : null;
    if (!displayed || displayed[1] !== tracks?.[id]?.version) {
      errors.push("README " + label + " version must match manifest track " + id + ".");
    }
  }

  const pVersion = tracks?.P?.version;
  if (!isDatedVersionHeading(firstNonEmptyLine(pChangelog), pVersion, "P")) {
    errors.push("P workstream changelog must start with its current version and a valid ISO date.");
  }


  if (!trackChangelogs || typeof trackChangelogs !== "object" || Array.isArray(trackChangelogs)) {
    errors.push("F–P track changelogs must be supplied as an object.");
  } else {
    for (const id of WORKSTREAM_IDS.slice(5)) {
      const version = tracks?.[id]?.version;
      const latestHeading = firstSectionHeading(trackChangelogs[id]);
      if (!isDatedVersionHeading(latestHeading, version, id, true)) {
        errors.push("Track " + id + " changelog must start with its current version and a valid ISO date.");
      }
    }
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
