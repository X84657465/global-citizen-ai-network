export type AiHistoryCandidate = {
  role?: unknown;
  content?: unknown;
};

export type AiChatMessage = {
  role: "assistant" | "user";
  content: string;
};

/**
 * Build provider context from a newest-first database result.
 * Only conversational roles are forwarded; system/tool rows are never
 * silently reclassified as user messages.
 */
export function buildAiProviderMessages(
  newestFirstHistory: readonly AiHistoryCandidate[],
  currentPrompt: string,
  maxTotalCharacters = 16000,
): { messages: AiChatMessage[]; totalCharacters: number } {
  const messages: AiChatMessage[] = [];
  let totalCharacters = currentPrompt.length;

  for (const item of [...newestFirstHistory].reverse()) {
    if (
      (item.role !== "assistant" && item.role !== "user")
      || typeof item.content !== "string"
      || totalCharacters + item.content.length > maxTotalCharacters
    ) continue;

    messages.push({ role: item.role, content: item.content });
    totalCharacters += item.content.length;
  }

  messages.push({ role: "user", content: currentPrompt });
  return { messages, totalCharacters };
}
