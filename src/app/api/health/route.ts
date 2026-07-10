import { NextResponse } from "next/server";

import { getAiProviderName, isAiConfigured } from "@/lib/ai/ai-provider";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight readiness probe for cold opens / uptime checks.
 * Pings Supabase to verify connectivity and keep the free tier active.
 */
export async function GET() {
  let provider: string | null = null;
  if (isAiConfigured()) {
    try {
      provider = getAiProviderName();
    } catch {
      provider = null;
    }
  }

  let dbConnected = false;
  try {
    // Basic ping to any table (like profiles or crm_leads) to check database connectivity
    const { error } = await supabase.from("import_jobs").select("id").limit(1);
    if (!error) {
      dbConnected = true;
    }
  } catch (dbErr) {
    console.error("Health check database ping failed:", dbErr);
  }

  return NextResponse.json(
    {
      status: "ok",
      aiConfigured: isAiConfigured(),
      provider,
      databaseConnected: dbConnected,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
