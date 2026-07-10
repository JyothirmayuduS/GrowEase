import { NextRequest, NextResponse } from "next/server";

import type { OAuthProvider } from "@/lib/integrations/config";
import { clearToken } from "@/lib/integrations/tokens";

const VALID: OAuthProvider[] = [
  "google-drive",
  "onedrive",
  "facebook",
  "google-ads",
];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { provider?: string };
  const provider = body.provider as OAuthProvider | undefined;
  if (!provider || !VALID.includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  await clearToken(provider);
  return NextResponse.json({ ok: true, provider });
}
