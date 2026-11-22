import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { restoreApiCooldownDeadline } from "../scripts/restore-agent-factory-api-cooldown.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "agent-factory-cooldown-restore-"));
  return {
    directory,
    artifactFile: join(directory, "artifact.txt"),
    envFile: join(directory, "github-env"),
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

test("restores only a canonical UTC deadline from the downloaded artifact", () => {
  const f = fixture();
  try {
    const deadline = "2026-11-22T12:34:56.789Z";
    writeFileSync(f.artifactFile, deadline + "\n", "utf8");
    const result = restoreApiCooldownDeadline(f);

    assert.deepEqual(result, { status: "restored", deadline });
    assert.equal(readFileSync(f.envFile, "utf8"), "AGENT_FACTORY_API_COOLDOWN_UNTIL=" + deadline + "\n");
  } finally {
    f.cleanup();
  }
});

test("does not write malformed, non-canonical, or non-UTC artifact values", () => {
  const f = fixture();
  try {
    for (const value of [
      "not-a-date",
      "2026-11-22T12:34:56Z",
      "2026-11-22T12:34:56.789+00:00",
      "2026-02-30T12:34:56.789Z",
      "2026-11-22T12:34:56.789Z\nAGENT_FACTORY_API_COOLDOWN_UNTIL=attacker",
    ]) {
      writeFileSync(f.artifactFile, value, "utf8");
      assert.deepEqual(restoreApiCooldownDeadline(f), { status: "invalid" });
    }
    assert.equal(existsSync(f.envFile), false);
  } finally {
    f.cleanup();
  }
});

test("ignores oversized artifacts without reading values into workflow output", () => {
  const f = fixture();
  try {
    writeFileSync(f.artifactFile, "x".repeat(1024), "utf8");
    assert.deepEqual(restoreApiCooldownDeadline(f), { status: "invalid" });
    assert.equal(existsSync(f.envFile), false);
  } finally {
    f.cleanup();
  }
});

test("treats an empty pre-created handoff file as no cooldown", () => {
  const f = fixture();
  try {
    writeFileSync(f.artifactFile, "", "utf8");
    assert.deepEqual(restoreApiCooldownDeadline(f), { status: "empty" });
    assert.equal(existsSync(f.envFile), false);
  } finally {
    f.cleanup();
  }
});

test("treats a missing artifact as an absent cooldown and does not mutate the environment", () => {
  const f = fixture();
  try {
    assert.deepEqual(restoreApiCooldownDeadline(f), { status: "missing" });
    assert.equal(existsSync(f.envFile), false);
  } finally {
    f.cleanup();
  }
});
