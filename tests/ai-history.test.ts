import test from "node:test";
import assert from "node:assert/strict";
import { buildAiProviderMessages } from "../lib/ai/history.ts";

test("preserves chronological order and appends the current prompt last", () => {
  const result = buildAiProviderMessages([
    { role: "user", content: "newest" },
    { role: "assistant", content: "middle" },
    { role: "user", content: "oldest" },
  ], "current");

  assert.deepEqual(result.messages, [
    { role: "user", content: "oldest" },
    { role: "assistant", content: "middle" },
    { role: "user", content: "newest" },
    { role: "user", content: "current" },
  ]);
  assert.equal(result.totalCharacters, 25);
});

test("never forwards system or tool rows as user messages", () => {
  const result = buildAiProviderMessages([
    { role: "tool", content: "tool output must not be reclassified" },
    { role: "system", content: "system content must not be reclassified" },
    { role: "assistant", content: "visible assistant reply" },
    { role: "user", content: "visible user message" },
  ], "current");

  assert.deepEqual(result.messages, [
    { role: "user", content: "visible user message" },
    { role: "assistant", content: "visible assistant reply" },
    { role: "user", content: "current" },
  ]);
});

test("enforces the aggregate character ceiling without dropping the current prompt", () => {
  const result = buildAiProviderMessages([
    { role: "user", content: "old".repeat(4) },
    { role: "assistant", content: "new".repeat(4) },
  ], "current", 20);

  assert.deepEqual(result.messages, [
    { role: "assistant", content: "new".repeat(4) },
    { role: "user", content: "current" },
  ]);
  assert.equal(result.totalCharacters, 19);
});

test("ignores malformed message candidates", () => {
  const result = buildAiProviderMessages([
    { role: "user", content: null },
    { role: "assistant", content: 12 },
    null as unknown as { role: unknown; content: unknown },
  ], "current");

  assert.deepEqual(result.messages, [{ role: "user", content: "current" }]);
});
