import { NextResponse } from "next/server";

import { getAiProviderName, isAiConfigured } from "@/lib/ai/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight readiness probe for cold opens / uptime checks.
 * Does not call the LLM — only reports whether keys are present.
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

  return NextResponse.json(
    {
      status: "ok",
      aiConfigured: isAiConfigured(),
      provider,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
