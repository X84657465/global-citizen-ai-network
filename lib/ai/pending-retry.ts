export type PendingRetryMessage = { role: string; content: string } | undefined;

export function hasPendingRetryContentMismatch(
  pendingKey: string,
  lastMessage: PendingRetryMessage,
  content: string,
): boolean {
  return Boolean(
    pendingKey &&
    lastMessage?.role === "user" &&
    lastMessage.content !== content
  );
}

export function shouldPreservePendingRequestKey(disposition: string): boolean {
  return disposition === "processing" || disposition === "conflict";
}
