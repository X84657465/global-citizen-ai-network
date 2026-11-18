import test from "node:test";
import assert from "node:assert/strict";
import { parseCreateContributionTaskInput } from "../lib/contribution-tasks/validation.ts";

const valid = {
  title: "Verify a public record",
  description: "Compare the published record with the original source and document the result.",
  category: "資料查核",
  acceptanceCriteria: ["附上可核對來源", "說明查核結果"],
  rewardAmount: 50,
  closesAt: null,
};

test("normalizes valid task input and preserves an explicit no-deadline value", () => {
  const result = parseCreateContributionTaskInput({
    ...valid,
    title: "  Verify a public record  ",
    acceptanceCriteria: [" 附上可核對來源 ", "說明查核結果"],
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, "Verify a public record");
    assert.deepEqual(result.value.acceptanceCriteria, ["附上可核對來源", "說明查核結果"]);
    assert.equal(result.value.closesAt, null);
  }
});

test("accepts a future ISO deadline and rejects an expired or invalid deadline", () => {
  const now = Date.parse("2026-11-18T05:00:00.000Z");
  assert.equal(parseCreateContributionTaskInput({ ...valid, closesAt: "2026-11-19T05:00:00.000Z" }, now).ok, true);
  assert.equal(parseCreateContributionTaskInput({ ...valid, closesAt: "2026-11-17T05:00:00.000Z" }, now).ok, false);
  assert.equal(parseCreateContributionTaskInput({ ...valid, closesAt: "not-a-date" }, now).ok, false);
});

test("rejects non-object, null, and array payloads", () => {
  for (const input of [null, [], "task", 12]) {
    assert.equal(parseCreateContributionTaskInput(input).ok, false);
  }
});

test("rejects missing or out-of-range required fields", () => {
  const invalid = [
    { ...valid, title: "ab" },
    { ...valid, description: "too short" },
    { ...valid, category: "x" },
    { ...valid, rewardAmount: Number.NaN },
    { ...valid, rewardAmount: -1 },
    { ...valid, rewardAmount: 100001 },
    { ...valid, acceptanceCriteria: [] },
    { ...valid, acceptanceCriteria: ["x"] },
    { ...valid, acceptanceCriteria: [1] },
    { ...valid, acceptanceCriteria: Array(21).fill("criterion") },
  ];
  for (const input of invalid) assert.equal(parseCreateContributionTaskInput(input).ok, false);
});

test("rejects oversized title, description, category, and criteria", () => {
  assert.equal(parseCreateContributionTaskInput({ ...valid, title: "x".repeat(181) }).ok, false);
  assert.equal(parseCreateContributionTaskInput({ ...valid, description: "x".repeat(5001) }).ok, false);
  assert.equal(parseCreateContributionTaskInput({ ...valid, category: "x".repeat(41) }).ok, false);
  assert.equal(parseCreateContributionTaskInput({ ...valid, acceptanceCriteria: ["x".repeat(501)] }).ok, false);
});

test("rejects string-encoded rewards instead of silently coercing client input", () => {
  assert.equal(parseCreateContributionTaskInput({ ...valid, rewardAmount: "50" }).ok, false);
});
