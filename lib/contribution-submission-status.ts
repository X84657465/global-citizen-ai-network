export type AppealStatusDetails = {
  status?: string | null;
  reason?: string | null;
  resolution?: string | null;
};

const submissionStatusLabels: Record<string, string> = {
  submitted: "已提交",
  pending_review: "審核中",
  under_review: "審核中",
  accepted: "已通過",
  rejected: "未通過",
  appealed: "申訴中",
};

const appealStatusLabels: Record<string, string> = {
  submitted: "申訴已送出",
  under_review: "申訴審核中",
  resolved: "申訴已結案",
  dismissed: "申訴未成立",
};

function normalizeStatus(status: string | null | undefined): string {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function unknownStatusLabel(status: string): string {
  if (!status) return "狀態待確認";
  // Remove C0/C1 controls and Unicode direction controls from untrusted status values.
  const safeStatus = status
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .slice(0, 80);
  return safeStatus ? `狀態待確認（${safeStatus}）` : "狀態待確認";
}

function lookupStatusLabel(labels: Record<string, string>, normalized: string): string {
  return Object.prototype.hasOwnProperty.call(labels, normalized)
    ? labels[normalized]
    : unknownStatusLabel(normalized);
}

export function getSubmissionStatusLabel(status: string | null | undefined): string {
  return lookupStatusLabel(submissionStatusLabels, normalizeStatus(status));
}

export function getAppealStatusLabel(status: string | null | undefined): string {
  return lookupStatusLabel(appealStatusLabels, normalizeStatus(status));
}

export function getAppealDetails(
  appeal: Pick<AppealStatusDetails, "reason" | "resolution"> | null | undefined,
): { reason?: string; resolution?: string } | null {
  if (!appeal) return null;
  const reason = typeof appeal.reason === "string" ? appeal.reason.trim() : "";
  const resolution = typeof appeal.resolution === "string" ? appeal.resolution.trim() : "";
  if (!reason && !resolution) return null;
  return {
    ...(reason ? { reason } : {}),
    ...(resolution ? { resolution } : {}),
  };
}
