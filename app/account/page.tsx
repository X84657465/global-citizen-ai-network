import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSummary from "@/components/account/account-summary";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=required");
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferred_language, role, account_status, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return <AccountSummary email={user.email ?? null} profile={profile} />;
}
