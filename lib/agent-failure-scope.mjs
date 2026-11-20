import { appendFileSync } from "node:fs";

// Persist task-scoped failures for the next GitHub Actions step without
// allowing an unavailable environment file to hide the primary failure.
export function markAgentFactoryTaskFailure(envPath) {
  if (typeof envPath !== "string" || envPath.length === 0) return false;
  try {
    appendFileSync(envPath, "AGENT_FACTORY_FAILURE_SCOPE=task\\n", "utf8");
    return true;
  } catch {
    return false;
  }
}
