import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContributionReviewClient from "./review-client";

export const dynamic = "force-dynamic";

export default async function ContributionReviewPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=required");
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,account_status").eq("id", user.id).maybeSingle();
  if (profileError || !profile || !["admin", "reviewer"].includes(profile.role) || profile.account_status !== "active") {
    redirect("/");
  }
  return <ContributionReviewClient />;
}
