import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { persistApiCooldownDeadline } from "../lib/agent-factory-api-cooldown.mjs";

test("persists only a bounded ISO provider deadline to workflow env and output", () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-factory-cooldown-"));
  const envFile = join(directory, "env");
  const outputFile = join(directory, "output");
  const now = 1_000_000;
  const deadline = persistApiCooldownDeadline({
    status: 429,
    message: "private provider response text",
    retryAfter: "3600",
    rateLimited: true,
  }, { now, envFile, outputFile });

  assert.equal(deadline, new Date(now + 3_600_000).toISOString());
  assert.equal(readFileSync(envFile, "utf8"), "AGENT_FACTORY_API_COOLDOWN_UNTIL=" + deadline + "\n");
  assert.equal(readFileSync(outputFile, "utf8"), "api_cooldown_until=" + deadline + "\n");
  assert.equal(readFileSync(envFile, "utf8").includes("private provider"), false);
  rmSync(directory, { recursive: true, force: true });
});

test("does not export a cooldown for non-rate-limit failures", () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-factory-cooldown-"));
  const envFile = join(directory, "env");
  const outputFile = join(directory, "output");

  assert.equal(persistApiCooldownDeadline({
    status: 403,
    message: "Resource not accessible by integration",
    rateLimited: false,
  }, { now: 1_000_000, envFile, outputFile }), null);

  assert.equal(existsSync(envFile), false);
  assert.equal(existsSync(outputFile), false);
  rmSync(directory, { recursive: true, force: true });
});
