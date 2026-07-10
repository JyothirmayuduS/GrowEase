import { createHash, randomBytes, timingSafeEqual } from "crypto";

import { getEnv } from "../../config/env";
import { getServiceClient } from "../../config/supabase";
import { OAuthError, ErrorCodes } from "../../utils/errors";
import type { IntegrationProvider } from "../../types/domain";

function hashState(state: string): string {
  return createHash("sha256")
    .update(`${getEnv().OAUTH_STATE_SECRET}:${state}`)
    .digest("hex");
}

export async function createOAuthState(input: {
  userId: string;
  provider: IntegrationProvider | string;
  codeVerifier?: string;
  ttlSeconds?: number;
}): Promise<{ state: string; stateHash: string }> {
  const state = randomBytes(32).toString("base64url");
  const stateHash = hashState(state);
  const expiresAt = new Date(Date.now() + (input.ttlSeconds ?? 600) * 1000).toISOString();

  const { error } = await getServiceClient().from("oauth_states").insert({
    user_id: input.userId,
    provider: input.provider,
    state_hash: stateHash,
    code_verifier: input.codeVerifier ?? null,
    expires_at: expiresAt,
  });
  if (error) {
    throw new OAuthError(ErrorCodes.DATABASE_ERROR, "Failed to persist OAuth state");
  }
  return { state, stateHash };
}

export async function consumeOAuthState(input: {
  state: string;
  provider: string;
  userId?: string;
}): Promise<{ userId: string; codeVerifier: string | null }> {
  const stateHash = hashState(input.state);
  const client = getServiceClient();
  const { data, error } = await client
    .from("oauth_states")
    .select("*")
    .eq("state_hash", stateHash)
    .eq("provider", input.provider)
    .maybeSingle();

  if (error || !data) {
    throw new OAuthError(ErrorCodes.GOOGLE_STATE_MISMATCH, "Invalid OAuth state");
  }
  if (data.used_at) {
    throw new OAuthError(ErrorCodes.GOOGLE_STATE_MISMATCH, "OAuth state already used");
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new OAuthError(ErrorCodes.GOOGLE_STATE_MISMATCH, "OAuth state expired");
  }
  if (input.userId && data.user_id !== input.userId) {
    throw new OAuthError(ErrorCodes.GOOGLE_STATE_MISMATCH, "OAuth state user mismatch");
  }

  // Constant-time compare of hashes (defense in depth)
  const a = Buffer.from(stateHash);
  const b = Buffer.from(data.state_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new OAuthError(ErrorCodes.GOOGLE_STATE_MISMATCH, "Invalid OAuth state");
  }

  await client
    .from("oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id as string, codeVerifier: (data.code_verifier as string) || null };
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
