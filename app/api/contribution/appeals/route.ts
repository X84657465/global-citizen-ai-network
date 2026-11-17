import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const parsed = await readJsonBody(request, 8192);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "請提供有效的申訴資料。" }, { status: parsed.ok ? 400 : parsed.status });
  }
  const body = parsed.value as { submissionId?: unknown; reason?: unknown };
  const submissionId = typeof body.submissionId === "string" ? body.submissionId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!isUuid(submissionId) || reason.length < 10 || reason.length > 4000) {
    return NextResponse.json({ error: "申訴理由須介於 10 至 4,000 字元。" }, { status: 400 });
  }

  const { data: submission, error: submissionError } = await auth.supabase
    .from("task_submissions").select("id,status")
    .eq("id", submissionId).eq("contributor_id", auth.user.id).maybeSingle();
  if (submissionError || !submission) return NextResponse.json({ error: "找不到這筆提交紀錄。" }, { status: 404 });
  if (submission.status !== "rejected") return NextResponse.json({ error: "只有已退回的成果可以提出申訴。" }, { status: 409 });

  const { data, error } = await auth.supabase.from("task_appeals").insert({
    submission_id: submissionId,
    appellant_id: auth.user.id,
    reason,
  }).select("id,submission_id,status,created_at").single();

  if (error) return NextResponse.json({ error: "申訴未建立，可能已經提出過申訴。" }, { status: 409 });
  return NextResponse.json({ appeal: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
