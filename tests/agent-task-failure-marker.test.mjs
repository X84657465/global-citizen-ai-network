import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTaskFailureScopeMarker } from "../lib/agent-task-failure-marker.mjs";

test("writes a task-scope marker only for a validated task with a valid issue number", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-task-marker-"));
  const envFile = join(directory, "github.env");
  try {
    writeFileSync(envFile, "", "utf8");
    assert.equal(writeTaskFailureScopeMarker({ issue: { number: 117 } }, envFile), true);
    assert.equal(readFileSync(envFile, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("does not mark missing, malformed, or out-of-range task identity as task-scoped", () => {
  const append = () => { throw new Error("must not be called"); };
  assert.equal(writeTaskFailureScopeMarker(null, "env", append), false);
  assert.equal(writeTaskFailureScopeMarker({ issue: null }, "env", append), false);
  assert.equal(writeTaskFailureScopeMarker({ issue: { number: 0 } }, "env", append), false);
  assert.equal(writeTaskFailureScopeMarker({ issue: { number: "117" } }, "env", append), false);
  assert.equal(writeTaskFailureScopeMarker({ issue: { number: 100_000_000 } }, "env", append), false);
  assert.equal(writeTaskFailureScopeMarker({ issue: { number: 117 } }, "", append), false);
});

test("marker persistence failure returns false so callers can fail closed to system scope", () => {
  assert.equal(
    writeTaskFailureScopeMarker({ issue: { number: 117 } }, "env", () => {
      throw new Error("filesystem unavailable");
    }),
    false,
  );
});
