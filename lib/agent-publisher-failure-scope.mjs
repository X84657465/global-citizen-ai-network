import { appendFileSync } from "node:fs";

export function persistPublicationFailureScope(scope, env = process.env, append = appendFileSync) {
  if (scope !== "task") return false;
  const envPath = env?.GITHUB_ENV;
  if (typeof envPath !== "string" || !envPath.trim()) return false;
  try {
    append(envPath, "AGENT_FACTORY_FAILURE_SCOPE=task\n", "utf8");
    return true;
  } catch {
    // Preserve the publisher's original failure even if the workflow env file is unavailable.
    return false;
  }
}
