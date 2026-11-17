import test from "node:test";
import assert from "node:assert/strict";
import {
  hasPendingRetryContentMismatch,
  shouldPreservePendingRequestKey,
} from "../lib/ai/pending-retry.ts";

test("blocks changed content while the previous user request is still pending", () => {
  assert.equal(
    hasPendingRetryContentMismatch("pending-key", { role: "user", content: "original prompt" }, "edited prompt"),
    true,
  );
});

test("allows the original content to be retried with the same key", () => {
  assert.equal(
    hasPendingRetryContentMismatch("pending-key", { role: "user", content: "original prompt" }, "original prompt"),
    false,
  );
});

test("does not block a new request when there is no pending key or no pending user message", () => {
  assert.equal(hasPendingRetryContentMismatch("", { role: "user", content: "original" }, "edited"), false);
  assert.equal(hasPendingRetryContentMismatch("pending-key", { role: "assistant", content: "answer" }, "edited"), false);
  assert.equal(hasPendingRetryContentMismatch("pending-key", undefined, "edited"), false);
});

test("preserves an idempotency key for processing and payload-conflict outcomes", () => {
  assert.equal(shouldPreservePendingRequestKey("processing"), true);
  assert.equal(shouldPreservePendingRequestKey("conflict"), true);
});

test("does not preserve an idempotency key after known failure or rejection", () => {
  assert.equal(shouldPreservePendingRequestKey("failed"), false);
  assert.equal(shouldPreservePendingRequestKey("rejected"), false);
});
