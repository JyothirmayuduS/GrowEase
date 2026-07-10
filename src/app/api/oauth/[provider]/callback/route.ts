import { NextRequest, NextResponse } from "next/server";

import type { OAuthProvider } from "@/lib/integrations/config";
import { verifyState } from "@/lib/integrations/crypto";
import { exchangeCode } from "@/lib/integrations/oauth";

const VALID: OAuthProvider[] = [
  "google-drive",
  "onedrive",
  "facebook",
  "google-ads",
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: raw } = await context.params;
  const provider = raw as OAuthProvider;
  const origin = request.nextUrl.origin;

  if (!VALID.includes(provider)) {
    return NextResponse.redirect(new URL("/settings/integrations?error=unknown", origin));
  }

  const error = request.nextUrl.searchParams.get("error");
  const errorDesc = request.nextUrl.searchParams.get("error_description");
  if (error) {
    const url = new URL("/settings/integrations", origin);
    url.searchParams.set("error", errorDesc || error);
    return NextResponse.redirect(url);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=missing_code", origin)
    );
  }

  const parsed = verifyState(state);
  if (!parsed || parsed.provider !== provider) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=invalid_state", origin)
    );
  }

  try {
    await exchangeCode(provider, code);
    const returnTo = parsed.returnTo || "/integrations/ads";
    const url = new URL(returnTo, origin);
    url.searchParams.set("connected", provider);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    const url = new URL("/settings/integrations", origin);
    url.searchParams.set("error", message.slice(0, 200));
    return NextResponse.redirect(url);
  }
}
