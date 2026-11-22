import { appendFileSync, readFileSync } from "node:fs";

const ENV_KEY = "AGENT_FACTORY_API_COOLDOWN_UNTIL";
const CANONICAL_UTC_MILLIS = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/;
const MAX_ARTIFACT_BYTES = 64;

/**
 * Restore only the publisher's canonical, bounded UTC deadline into the
 * downstream state-writer environment. The artifact is data, never shell code.
 */
export function restoreApiCooldownDeadline({ artifactFile, envFile } = {}) {
  if (typeof artifactFile !== "string" || artifactFile.length === 0 ||
      typeof envFile !== "string" || envFile.length === 0) {
    throw new TypeError("Cooldown artifact and environment file paths are required.");
  }

  let raw;
  try {
    raw = readFileSync(artifactFile, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { status: "missing" };
    throw error;
  }

  if (Buffer.byteLength(raw, "utf8") > MAX_ARTIFACT_BYTES) {
    return { status: "invalid" };
  }

  const value = raw.endsWith("\\n") ? raw.slice(0, -1) : raw;
  if (value.length === 0) return { status: "empty" };
  if (!CANONICAL_UTC_MILLIS.test(value)) return { status: "invalid" };

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    return { status: "invalid" };
  }

  appendFileSync(envFile, ENV_KEY + "=" + value + "\\n", "utf8");
  return { status: "restored", deadline: value };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const [artifactFile, envFile] = process.argv.slice(2);
  try {
    const result = restoreApiCooldownDeadline({ artifactFile, envFile });
    if (result.status === "invalid") {
      console.warn("Ignoring malformed publisher cooldown handoff.");
    }
    process.exitCode = 0;
  } catch {
    console.error("Unable to restore publisher cooldown handoff.");
    process.exitCode = 1;
  }
}
