import {
  getProviderConfig,
  oauthCallbackUrl,
  type OAuthProvider,
} from "./config";
import { readToken, saveToken, type StoredToken } from "./tokens";

export function buildAuthorizeUrl(provider: OAuthProvider, state: string): string {
  const cfg = getProviderConfig(provider);
  if (!cfg.configured || !cfg.clientId) {
    throw new Error(`${provider} is not configured`);
  }
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", oauthCallbackUrl(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", cfg.scopes.join(" "));
  url.searchParams.set("state", state);
  for (const [k, v] of Object.entries(cfg.extraAuthParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCode(
  provider: OAuthProvider,
  code: string
): Promise<StoredToken> {
  const cfg = getProviderConfig(provider);
  if (!cfg.configured || !cfg.clientId || !cfg.clientSecret) {
    throw new Error(`${provider} is not configured`);
  }

  let json: TokenResponse & { error?: string; error_description?: string };

  if (provider === "facebook") {
    const url = new URL(cfg.tokenUrl);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("client_secret", cfg.clientSecret);
    url.searchParams.set("redirect_uri", oauthCallbackUrl(provider));
    url.searchParams.set("code", code);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 300)}`);
    }
    json = (await res.json()) as typeof json;
  } else {
    const body = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: oauthCallbackUrl(provider),
      grant_type: "authorization_code",
    });
    const res = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 300)}`);
    }
    json = (await res.json()) as typeof json;
  }
  if (!json.access_token) {
    throw new Error(json.error_description || json.error || "No access_token returned");
  }

  const profile = await fetchProfile(provider, json.access_token);

  const token: StoredToken = {
    provider,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    email: profile.email,
    name: profile.name,
    scope: json.scope,
    meta: profile.meta,
  };

  // Facebook: exchange for long-lived user token when possible
  if (provider === "facebook") {
    const longLived = await exchangeFacebookLongLived(json.access_token);
    if (longLived) {
      token.accessToken = longLived.access_token;
      token.expiresAt = longLived.expires_in
        ? Date.now() + longLived.expires_in * 1000
        : token.expiresAt;
    }
  }

  await saveToken(token);
  return token;
}

async function exchangeFacebookLongLived(shortToken: string) {
  const cfg = getProviderConfig("facebook");
  if (!cfg.clientId || !cfg.clientSecret) return null;
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("client_secret", cfg.clientSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; expires_in?: number };
}

async function fetchProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<{ email?: string; name?: string; meta?: Record<string, string> }> {
  try {
    if (provider === "google-drive" || provider === "google-ads") {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return {};
      const data = (await res.json()) as { email?: string; name?: string };
      return { email: data.email, name: data.name };
    }
    if (provider === "onedrive") {
      const res = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return {};
      const data = (await res.json()) as {
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
      };
      return {
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
      };
    }
    if (provider === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
      );
      if (!res.ok) return {};
      const data = (await res.json()) as { id?: string; name?: string; email?: string };
      return {
        email: data.email,
        name: data.name,
        meta: data.id ? { userId: data.id } : undefined,
      };
    }
  } catch {
    /* ignore profile errors */
  }
  return {};
}

export async function refreshIfNeeded(provider: OAuthProvider): Promise<StoredToken | null> {
  const token = await readToken(provider);
  if (!token) return null;
  if (!token.expiresAt || token.expiresAt > Date.now() + 60_000) return token;
  if (!token.refreshToken) return token;

  const cfg = getProviderConfig(provider);
  if (!cfg.clientId || !cfg.clientSecret) return token;

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: token.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return token;

  const json = (await res.json()) as TokenResponse;
  if (!json.access_token) return token;

  const next: StoredToken = {
    ...token,
    accessToken: json.access_token,
    refreshToken: json.refresh_token || token.refreshToken,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : token.expiresAt,
    scope: json.scope || token.scope,
  };
  await saveToken(next);
  return next;
}
