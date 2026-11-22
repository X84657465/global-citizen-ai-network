import { appendFileSync, closeSync, fstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ENV_KEY = "AGENT_FACTORY_API_COOLDOWN_UNTIL";
const CANONICAL_UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
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
  let descriptor;
  try {
    descriptor = openSync(artifactFile, "r");
    if (fstatSync(descriptor).size > MAX_ARTIFACT_BYTES) {
      return { status: "invalid" };
    }
    // Read at most one byte beyond the accepted limit to remain bounded even
    // if the artifact changes between the size check and the read.
    const buffer = Buffer.alloc(MAX_ARTIFACT_BYTES + 1);
    const bytesRead = readSync(descriptor, buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_ARTIFACT_BYTES) return { status: "invalid" };
    raw = buffer.subarray(0, bytesRead).toString("utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { status: "missing" };
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  const value = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  if (value.length === 0) return { status: "empty" };
  if (!CANONICAL_UTC_MILLIS.test(value)) return { status: "invalid" };

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    return { status: "invalid" };
  }

  appendFileSync(envFile, ENV_KEY + "=" + value + "\n", "utf8");
  return { status: "restored", deadline: value };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
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
