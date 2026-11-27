import { appendFileSync } from "node:fs";
import { createAgentFactoryController } from "../lib/agent-factory-controller.mjs";
import { createFactoryStateStore, inspectFactoryStateCapacity } from "../lib/agent-factory-state-store.mjs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { persistApiCooldownDeadline } from "../lib/agent-factory-api-cooldown.mjs";

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const apiBase = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");

function writeOutput(key, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  const safeValue = String(value ?? "").replace(/[\r\n]/g, " ");
  appendFileSync(output, key + "=" + safeValue + "\n", "utf8");
}

function writeEnv(key, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) return;
  const safeValue = String(value ?? "").replace(/[\r\n]/g, " ");
  appendFileSync(envFile, key + "=" + safeValue + "\n", "utf8");
}

async function main() {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
  }
  const api = createGitHubApiClient({
    baseUrl: apiBase,
    token,
    timeoutMs: 15_000,
    maxRetries: 2,
    maxInlineRetryDelayMs: 30_000,
  });
  const store = createFactoryStateStore(api, {
    repository,
    issueNumber: process.env.AGENT_FACTORY_STATE_ISSUE_NUMBER,
  });
  const controller = createAgentFactoryController({ store, api, repository });
  let result;
  try {
    result = await controller.run(process.env);
  } catch (error) {
    // Preserve GitHub's bounded rate-limit deadline for the later failure callback.
    // GITHUB_ENV is scoped to subsequent steps in this job; no raw headers or tokens are exported.
    if (error?.rateLimited === true) {
      try {
        persistApiCooldownDeadline(error);
      } catch {
        // Keep the original failure; the normal breaker cooldown remains the fallback.
      }
      // The telemetry read also calls GitHub. Respect the cooldown before
      // making any further requests, even when exporting the deadline fails.
      throw error;
    }
    // A capacity guard can reject a write before run() returns a result.
    // On failure only, re-read the durable state and emit count-only telemetry
    // so a full ledger/body does not fail silently before the normal report.
    try {
      const current = await store.read();
      const capacity = inspectFactoryStateCapacity(current.state);
      if (capacity.status !== "healthy") {
        console.warn(
          "Agent Factory state capacity " + capacity.status +
          ": processed_events=" + capacity.processed_events.count + "/" + capacity.processed_events.limit +
          ", issue_body_chars=" + capacity.issue_body.characters + "/" + capacity.issue_body.limit,
        );
      }
    } catch {
      // Preserve the original controller failure; telemetry must never mask it.
    }
    throw error;
  }

  for (const [key, value] of Object.entries(result.outputs ?? {})) writeOutput(key, value);
  const stateIssueNumber = store.getStateIssueNumber();
  if (stateIssueNumber) {
    writeOutput("state_issue_number", stateIssueNumber);
    writeEnv("AGENT_FACTORY_STATE_ISSUE_NUMBER", stateIssueNumber);
  }
  if (result.mode === "reserve" && result.outputs?.lease_id) {
    writeEnv("AGENT_FACTORY_LEASE_ID", result.outputs.lease_id);
  }
  console.log("Agent Factory V2 controller mode: " + result.mode);
  const capacity = inspectFactoryStateCapacity(result.state);
  if (capacity.status !== "healthy") {
    console.warn(
      "Agent Factory state capacity " + capacity.status +
      ": processed_events=" + capacity.processed_events.count + "/" + capacity.processed_events.limit +
      ", issue_body_chars=" + capacity.issue_body.characters + "/" + capacity.issue_body.limit,
    );
  }
  console.log("State version: " + result.state.state_version);
  console.log("Active task: " + (result.state.active_task?.issue_number ?? "none"));
  if (result.outputs?.cooldown_active) {
    console.log("System circuit breaker active until " + result.outputs.cooldown_until);
  }
  if (result.outputs?.lease_recovered) {
    console.log("Recovered expired worker lease for Issue #" + result.outputs.recovered_issue_number);
  }
}

main().catch((error) => {
  console.error("Agent Factory V2 controller failed: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
