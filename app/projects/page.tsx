import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=required");
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return <ProjectsClient />;
}
