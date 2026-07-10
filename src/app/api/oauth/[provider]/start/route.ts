import { NextRequest, NextResponse } from "next/server";

import { getProviderConfig, type OAuthProvider } from "@/lib/integrations/config";
import { signState } from "@/lib/integrations/crypto";
import { buildAuthorizeUrl } from "@/lib/integrations/oauth";

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
  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const cfg = getProviderConfig(provider);
  if (!cfg.configured) {
    const returnTo =
      request.nextUrl.searchParams.get("returnTo") || "/integrations/ads";
    const url = new URL("/settings/integrations", request.nextUrl.origin);
    url.searchParams.set("missing", provider);
    url.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(url);
  }

  const returnTo =
    request.nextUrl.searchParams.get("returnTo") ||
    (provider === "google-drive" || provider === "onedrive"
      ? "/lead-sources"
      : "/integrations/ads");

  const state = signState({ provider, returnTo });
  const authorizeUrl = buildAuthorizeUrl(provider, state);
  return NextResponse.redirect(authorizeUrl);
}
