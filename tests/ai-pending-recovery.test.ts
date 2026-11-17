import test from "node:test";
import assert from "node:assert/strict";
import {
  findOriginalPendingMessage,
  hashPendingPrompt,
} from "../lib/ai/pending-recovery.ts";

const conversationId = "8c3c5d8e-6d7b-4a7e-8b10-9d8c7b6a5f40";
const original = "請幫我整理專案目前的風險與待辦事項";

test("recovers the exact user prompt by its conversation-bound SHA-256 hash", () => {
  const requestHash = hashPendingPrompt(conversationId, original);
  const recovered = findOriginalPendingMessage([
    { role: "assistant", content: "not the prompt" },
    { role: "user", content: "a later unrelated message" },
    { role: "user", content: original },
  ], conversationId, requestHash);

  assert.deepEqual(recovered, { content: original });
});

test("does not recover a prompt whose hash belongs to another conversation", () => {
  const requestHash = hashPendingPrompt(conversationId, original);
  assert.equal(findOriginalPendingMessage(
    [{ role: "user", content: original }],
    "11111111-1111-4111-8111-111111111111",
    requestHash,
  ), null);
});

test("does not recover modified content when the conversation is unchanged", () => {
  const requestHash = hashPendingPrompt(conversationId, original);
  assert.equal(findOriginalPendingMessage(
    [{ role: "user", content: "內容遭到修改" }],
    conversationId,
    requestHash,
  ), null);
});

test("rejects malformed hashes and invalid prompt candidates", () => {
  assert.equal(findOriginalPendingMessage([{ role: "user", content: original }], conversationId, "bad-hash"), null);
  assert.equal(findOriginalPendingMessage([{ role: "assistant", content: original }], conversationId, hashPendingPrompt(conversationId, original)), null);
  assert.equal(findOriginalPendingMessage([{ role: "user", content: "" }], conversationId, hashPendingPrompt(conversationId, "")), null);
  assert.equal(findOriginalPendingMessage([{ role: "user", content: "x".repeat(8001) }], conversationId, hashPendingPrompt(conversationId, "x".repeat(8001))), null);
});

test("accepts the fixed-width database hash with trailing CHAR padding", () => {
  const requestHash = hashPendingPrompt(conversationId, original);
  assert.deepEqual(findOriginalPendingMessage(
    [{ role: "user", content: original }],
    conversationId,
    requestHash + "   ",
  ), { content: original });
});
