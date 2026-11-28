import test from "node:test";
import assert from "node:assert/strict";
import { parseStrictTapSummary } from "../lib/agent-factory-local-sandbox.mjs";

function tap(rootPoint = "ok 1 - accepted", plan = "1..1") {
  return [
    "TAP version 13",
    rootPoint,
    plan,
    "# tests 1",
    "# pass 1",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# todo 0",
    "",
  ].join("\n");
}

test("strict TAP parser accepts one complete root result with nested subtest records", () => {
  const output = [
    "TAP version 13",
    "# Subtest: nested",
    "    1..1",
    "    ok 1 - nested assertion",
    "ok 1 - nested",
    "1..1",
    "# tests 1",
    "# pass 1",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# todo 0",
  ].join("\n");
  assert.equal(parseStrictTapSummary(output).valid, true);
});

test("strict TAP parser rejects duplicate or contradictory summary keys", () => {
  assert.equal(parseStrictTapSummary(tap() + "# tests 999\n").valid, false);
  assert.equal(parseStrictTapSummary(tap() + "# pass 0\n").valid, false);
});

test("strict TAP parser rejects root point numbering that disagrees with the plan", () => {
  assert.equal(parseStrictTapSummary(tap("ok 999 - forged", "1..1")).valid, false);
  assert.equal(parseStrictTapSummary(tap("ok 1 - first\nok 2 - extra", "1..1")).valid, false);
  assert.equal(parseStrictTapSummary(tap("not ok 1 - failed", "1..1")).valid, false);
});

test("strict TAP parser rejects duplicate plans and incomplete root output", () => {
  assert.equal(parseStrictTapSummary(tap() + "1..1\n").valid, false);
  assert.equal(parseStrictTapSummary(tap("", "1..2")).valid, false);
  assert.equal(parseStrictTapSummary(tap().replace("# todo 0", "")).valid, false);
});
