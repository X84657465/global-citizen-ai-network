import { createHash, timingSafeEqual } from "node:crypto";

export type PendingMessageCandidate = {
  role?: unknown;
  content?: unknown;
};

export function hashPendingPrompt(conversationId: string, content: string): string {
  return createHash("sha256")
    .update(`${conversationId.toLowerCase()}\n${content}`)
    .digest("hex");
}

export function findOriginalPendingMessage(
  messages: readonly PendingMessageCandidate[],
  conversationId: string,
  requestHash: string | null | undefined,
): { content: string } | null {
  const expected = requestHash?.trim() ?? "";
  if (!/^[0-9a-f]{64}$/i.test(expected) || !conversationId) return null;

  const expectedBytes = Buffer.from(expected, "hex");
  for (const message of messages) {
    if (
      message.role !== "user" ||
      typeof message.content !== "string" ||
      message.content.length < 1 ||
      message.content.length > 8000
    ) continue;

    const actualBytes = Buffer.from(hashPendingPrompt(conversationId, message.content), "hex");
    if (actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)) {
      return { content: message.content };
    }
  }
  return null;
}
