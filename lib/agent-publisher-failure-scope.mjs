import { appendFileSync } from "node:fs";

export function persistPublicationFailureScope(scope, env = process.env, append = appendFileSync) {
  if (scope !== "task") return false;
  const envPath = env?.GITHUB_ENV;
  if (typeof envPath !== "string" || !envPath.trim()) return false;
  append(envPath, "AGENT_FACTORY_FAILURE_SCOPE=task\n", { encoding: "utf8" });
  return true;
}
