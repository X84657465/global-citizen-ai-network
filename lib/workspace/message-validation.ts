export type WorkspaceMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

export function isWorkspaceMessage(value: unknown): value is WorkspaceMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { id?: unknown; role?: unknown; content?: unknown; created_at?: unknown };
  return (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    (candidate.id === undefined || isUuid(candidate.id)) &&
    (candidate.created_at === undefined || isValidTimestamp(candidate.created_at));
}
