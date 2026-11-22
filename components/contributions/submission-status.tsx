import {
  getAppealDetails,
  getAppealStatusLabel,
  getSubmissionStatusLabel,
  type AppealStatusDetails,
} from "@/lib/contribution-submission-status";

type SubmissionStatusProps = {
  status: string | null | undefined;
  appeal?: AppealStatusDetails | null;
};

export default function SubmissionStatus({ status, appeal }: SubmissionStatusProps) {
  const details = getAppealDetails(appeal);
  const hasAppealStatus = typeof appeal?.status === "string" && appeal.status.trim().length > 0;

  return (
    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <div role="status" aria-label="任務提交狀態" style={{ fontSize: 12 }}>
        <strong>提交狀態：{getSubmissionStatusLabel(status)}</strong>
      </div>
      {hasAppealStatus ? (
        <div style={{ color: "#64748b", fontSize: 11, lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>申訴狀態：{getAppealStatusLabel(appeal?.status)}</p>
          {details?.reason ? <p style={{ margin: 0 }}>申訴理由：{details.reason}</p> : null}
          {details?.resolution ? <p style={{ margin: 0 }}>處理結果：{details.resolution}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
