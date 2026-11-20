export type WorkspaceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2}):(\\d{2})(?:\\.(\\d{1,9}))?(Z|([+-])(\\d{2}):(\\d{2}))$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  const daysInMonth = month >= 1 && month <= 12
    ? [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    : 0;

  if (
    year < 1 || year > 9999 || day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 14 || offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) return false;

  return zone === "Z" || Number.isFinite(Date.parse(value));
}

export function isWorkspaceMessage(value: unknown): value is WorkspaceMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { id?: unknown; role?: unknown; content?: unknown; created_at?: unknown };
  return (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    isUuid(candidate.id) &&
    isValidTimestamp(candidate.created_at);
}
