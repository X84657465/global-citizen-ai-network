import { appendFileSync } from "node:fs";
import { apiCooldownUntil } from "./agent-factory-policy.mjs";

const ENV_KEY = "AGENT_FACTORY_API_COOLDOWN_UNTIL";
const OUTPUT_KEY = "api_cooldown_until";

/**
 * Persist a bounded provider retry deadline for the workflow's later durable
 * failure callback. Only a structured rate-limit error is accepted; raw
 * headers, messages, paths and credentials are never written to workflow files.
 */
export function persistApiCooldownDeadline(error, options = {}) {
  if (error?.rateLimited !== true) return null;

  const now = options.now ?? Date.now();
  const deadline = apiCooldownUntil(error, now);
  if (!Number.isFinite(Date.parse(deadline))) return null;

  const envFile = options.envFile ?? process.env.GITHUB_ENV ?? "";
  const outputFile = options.outputFile ?? process.env.GITHUB_OUTPUT ?? "";
  const envLine = ENV_KEY + "=" + deadline + "\n";
  const outputLine = OUTPUT_KEY + "=" + deadline + "\n";

  if (envFile) appendFileSync(envFile, envLine, "utf8");
  if (outputFile) appendFileSync(outputFile, outputLine, "utf8");
  return deadline;
}
