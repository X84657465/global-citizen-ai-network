import { appendFileSync } from "node:fs";

const MAX_GITHUB_ISSUE_NUMBER = 99_999_999;

export function writeTaskFailureScopeMarker(task, envFile, append = appendFileSync) {
  const issueNumber = task?.issue?.number;
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1 || issueNumber > MAX_GITHUB_ISSUE_NUMBER) {
    return false;
  }
  if (typeof envFile !== "string" || envFile.length === 0 || typeof append !== "function") {
    return false;
  }

  try {
    append(envFile, "AGENT_FACTORY_FAILURE_SCOPE=task\n", "utf8");
    return true;
  } catch {
    return false;
  }
}
