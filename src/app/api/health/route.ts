import { NextResponse } from "next/server";

import { getAiProviderName, isAiConfigured } from "@/lib/ai/ai-provider";

export async function GET() {
  let provider: string | null = null;
  if (isAiConfigured()) {
    try {
      provider = getAiProviderName();
    } catch {
      provider = null;
    }
  }

  return NextResponse.json({
    status: "ok",
    aiConfigured: isAiConfigured(),
    provider,
  });
}
