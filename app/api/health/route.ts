import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight deployment smoke check.
 * Reports configuration presence only; never returns secret values or claims
 * that a configured integration has been successfully authenticated.
 */
export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const aiProvider = process.env.AI_PROVIDER ?? "mock";
  const aiConfigured =
    aiProvider === "mock" ||
    Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL && process.env.AI_MAX_REQUEST_COST_TWD && process.env.AI_INPUT_COST_PER_MILLION_TWD && process.env.AI_OUTPUT_COST_PER_MILLION_TWD);

  return NextResponse.json(
    {
      status: "ok",
      service: "global-citizen-ai-network",
      timestamp: new Date().toISOString(),
      integrations: {
        database: {
          configured: supabaseConfigured,
          status: supabaseConfigured ? "credentials_present_not_connection_tested" : "not_configured",
        },
        ai: {
          provider: aiProvider,
          configured: aiConfigured,
          status: aiConfigured ? "configuration_present_not_live_tested" : "not_configured",
        },
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
