import assert from "node:assert/strict";
import test from "node:test";

import {
  getAppealDetails,
  getAppealStatusLabel,
  getSubmissionStatusLabel,
} from "../lib/contribution-submission-status.ts";

test("maps every documented submission status to Traditional Chinese", () => {
  const cases = [
    ["submitted", "已提交"],
    ["pending_review", "審核中"],
    ["under_review", "審核中"],
    ["accepted", "已通過"],
    ["rejected", "未通過"],
    ["appealed", "申訴中"],
  ] as const;

  for (const [status, expected] of cases) {
    assert.equal(getSubmissionStatusLabel(status), expected);
  }
});

test("keeps unknown and empty submission statuses understandable", () => {
  assert.equal(getSubmissionStatusLabel("future_state"), "狀態待確認（future_state）");
  assert.equal(getSubmissionStatusLabel("  "), "狀態待確認");
  assert.equal(getSubmissionStatusLabel(null), "狀態待確認");
  assert.equal(getSubmissionStatusLabel("  ACCEPTED "), "已通過");
});

test("maps persisted appeal lifecycle states", () => {
  assert.equal(getAppealStatusLabel("submitted"), "申訴已送出");
  assert.equal(getAppealStatusLabel("under_review"), "申訴審核中");
  assert.equal(getAppealStatusLabel("resolved"), "申訴已結案");
  assert.equal(getAppealStatusLabel("dismissed"), "申訴未成立");
  assert.equal(getAppealStatusLabel("future_state"), "狀態待確認（future_state）");
});

test("does not expose appeal details when no API details are present", () => {
  assert.equal(getAppealDetails(undefined), null);
  assert.equal(getAppealDetails(null), null);
  assert.equal(getAppealDetails({ reason: "  ", resolution: null }), null);
  assert.equal(getAppealDetails({ reason: null, resolution: " " }), null);
});

test("returns only appeal details supplied by the API", () => {
  assert.deepEqual(getAppealDetails({ reason: "資料已補充", resolution: null }), {
    reason: "資料已補充",
  });
  assert.deepEqual(getAppealDetails({ reason: null, resolution: "維持原審核結果" }), {
    resolution: "維持原審核結果",
  });
  assert.deepEqual(getAppealDetails({ reason: "理由", resolution: "結果" }), {
    reason: "理由",
    resolution: "結果",
  });
});
