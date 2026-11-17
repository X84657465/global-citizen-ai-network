import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const [{ data: contributions, error: contributionError }, { data: rewards, error: rewardError }, { data: submissions, error: submissionError }, { data: appeals, error: appealError }] = await Promise.all([
    auth.supabase.from("contribution_ledger")
      .select("id,event_type,points,metadata,occurred_at")
      .order("occurred_at", { ascending: false }).limit(100),
    auth.supabase.from("reward_ledger")
      .select("id,event_type,amount,currency,status,reason,occurred_at")
      .order("occurred_at", { ascending: false }).limit(100),
    auth.supabase.from("task_submissions")
      .select("id,task_id,status,submitted_at")
      .order("submitted_at", { ascending: false }).limit(100),
    auth.supabase.from("task_appeals")
      .select("id,submission_id,status,reason,resolution,created_at,resolved_at")
      .order("created_at", { ascending: false }).limit(100),
  ]);

  if (contributionError || rewardError || submissionError || appealError) {
    return NextResponse.json({ error: "目前無法讀取貢獻與獎勵帳本。" }, { status: 503 });
  }

  const contributionRows = contributions ?? [];
  const rewardRows = rewards ?? [];
  const points = contributionRows.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const earned = rewardRows.filter(row => row.event_type === "earned");
  const pendingTwd = earned.filter(row => row.currency.trim() === "TWD" && row.status === "pending")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const confirmedTwd = earned.filter(row => row.currency.trim() === "TWD" && row.status === "confirmed")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return NextResponse.json({
    summary: {
      contributionEvents: contributionRows.length,
      points,
      pendingRewardTwd: pendingTwd,
      confirmedRewardTwd: confirmedTwd,
      note: "待確認與已確認獎勵均不等於已提領現金；目前不提供自動現金提領。",
    },
    contributions: contributionRows,
    rewards: rewardRows,
    submissions: submissions ?? [],
    appeals: appeals ?? [],
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
