import { cookies } from "next/headers";

import type { OAuthProvider } from "./config";
import { decryptJson, encryptJson } from "./crypto";

export interface StoredToken {
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  email?: string;
  name?: string;
  scope?: string;
  /** Facebook page tokens etc. */
  meta?: Record<string, string>;
}

const COOKIE_PREFIX = "ge_oauth_";

function cookieName(provider: OAuthProvider): string {
  return `${COOKIE_PREFIX}${provider.replace(/-/g, "_")}`;
}

export async function saveToken(token: StoredToken): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(token.provider), encryptJson(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readToken(provider: OAuthProvider): Promise<StoredToken | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(provider))?.value;
  if (!raw) return null;
  return decryptJson<StoredToken>(raw);
}

export async function clearToken(provider: OAuthProvider): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(provider));
}

export async function listConnectedProviders(): Promise<
  Array<{
    provider: OAuthProvider;
    connected: boolean;
    email?: string;
    name?: string;
    expiresAt?: number;
  }>
> {
  const providers: OAuthProvider[] = [
    "google-drive",
    "onedrive",
    "facebook",
    "google-ads",
  ];
  const out = [];
  for (const provider of providers) {
    const token = await readToken(provider);
    out.push({
      provider,
      connected: Boolean(token?.accessToken),
      email: token?.email,
      name: token?.name,
      expiresAt: token?.expiresAt,
    });
  }
  return out;
}
