import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isValidTimestamp, isWorkspaceMessage } from "../lib/workspace/message-validation.ts";

const validId = "8c3c5d8e-6d7b-4a7e-8b10-9d8c7b6a5f40";
const validMessage = {
  id: validId,
  role: "user",
  content: "hello",
  created_at: "2026-11-20T10:00:00.000Z",
};

test("accepts valid user and assistant message records", () => {
  assert.equal(isWorkspaceMessage(validMessage), true);
  assert.equal(isWorkspaceMessage({ ...validMessage, role: "assistant" }), true);
});

test("rejects malformed records and roles outside the workspace contract", () => {
  for (const value of [
    null,
    [],
    "message",
    { ...validMessage, role: "system" },
    { ...validMessage, role: "tool" },
    { ...validMessage, content: 42 },
    { ...validMessage, id: "not-a-uuid" },
    { role: "assistant", content: "missing identity" },
    { ...validMessage, id: undefined },
    { ...validMessage, created_at: undefined },
    { ...validMessage, created_at: "not-a-date" },
    { ...validMessage, created_at: 1732000000 },
  ]) {
    assert.equal(isWorkspaceMessage(value), false);
  }
});

test("validates calendar dates, clock fields and timezone offsets strictly", () => {
  for (const timestamp of [
    "2026-02-29T10:00:00Z",
    "2026-13-01T10:00:00Z",
    "2026-11-20T24:00:00Z",
    "2026-11-20T10:60:00Z",
    "2026-11-20T10:00:60Z",
    "2026-11-20T10:00:00+14:01",
    "2026-11-20T10:00:00+15:00",
    "2026-11-20 10:00:00Z",
    "2026-11-20T10:00:00",
  ]) {
    assert.equal(isValidTimestamp(timestamp), false, timestamp);
  }
  assert.equal(isValidTimestamp("2024-02-29T10:00:00.123456789+14:00"), true);
  assert.equal(isValidTimestamp("2026-11-20T10:00:00-08:00"), true);
});

test("workspace message loading validates the response envelope and catches malformed JSON/network failures", () => {
  const client = readFileSync(new URL("../app/workspace/workspace-client.tsx", import.meta.url), "utf8");
  assert.match(client, /const parsed: unknown = await response\.json\(\)/);
  assert.match(client, /!parsed \|\| typeof parsed !== "object" \|\| Array\.isArray\(parsed\)/);
  assert.match(client, /!Array\.isArray\(data\.messages\) \|\| !data\.messages\.every\(isWorkspaceMessage\)/);
  assert.match(client, /catch \(reason\)/);
});

test("conversation and project metadata timestamps are validated before entering workspace state", () => {
  const client = readFileSync(new URL("../app/workspace/workspace-client.tsx", import.meta.url), "utf8");
  assert.match(client, /import \{ isValidTimestamp, isWorkspaceMessage \}/);
  assert.match(client, /data\.conversations\.filter\(conversation =>[\s\S]*?conversation && typeof conversation === "object" && isValidTimestamp\(conversation\.updated_at\)/);
  assert.match(client, /project && typeof project === "object" &&[\s\S]*?project\.archived_at === null \|\| isValidTimestamp\(project\.archived_at\)/);
});
