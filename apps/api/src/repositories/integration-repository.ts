import { getServiceClient } from "../config/supabase";
import { AppError, ErrorCodes, NotFoundError } from "../utils/errors";
import type { IntegrationProvider } from "../types/domain";
import { tokenEncryption } from "../services/security/token-encryption";

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: string;
  account_email: string | null;
  provider_account_id: string | null;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expiry: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
}

export async function upsertIntegration(input: {
  userId: string;
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date | null;
  accountEmail?: string;
  providerAccountId?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const payload = {
    user_id: input.userId,
    provider: input.provider,
    status: "connected",
    account_email: input.accountEmail ?? null,
    provider_account_id: input.providerAccountId ?? null,
    encrypted_access_token: tokenEncryption.encrypt(input.accessToken),
    encrypted_refresh_token: input.refreshToken
      ? tokenEncryption.encrypt(input.refreshToken)
      : null,
    token_expiry: input.tokenExpiry ? input.tokenExpiry.toISOString() : null,
    scopes: input.scopes ?? [],
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await getServiceClient().from("integrations").upsert(payload, {
    onConflict: "user_id,provider",
  });
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to save integration", 500);
}

export async function getIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<IntegrationRow | null> {
  const { data, error } = await getServiceClient()
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to load integration", 500);
  return data as IntegrationRow | null;
}

export async function requireIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<IntegrationRow> {
  const row = await getIntegration(userId, provider);
  if (!row || row.status !== "connected" || !row.encrypted_access_token) {
    throw new NotFoundError(`${provider} is not connected`, ErrorCodes.RESOURCE_NOT_FOUND);
  }
  return row;
}

export function decryptTokens(row: IntegrationRow): {
  accessToken: string;
  refreshToken?: string;
} {
  if (!row.encrypted_access_token) {
    throw new AppError(ErrorCodes.MICROSOFT_TOKEN_EXPIRED, "Missing access token", 401);
  }
  return {
    accessToken: tokenEncryption.decrypt(row.encrypted_access_token),
    refreshToken: row.encrypted_refresh_token
      ? tokenEncryption.decrypt(row.encrypted_refresh_token)
      : undefined,
  };
}

export async function disconnectIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<void> {
  const { error } = await getServiceClient()
    .from("integrations")
    .update({
      status: "disconnected",
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      token_expiry: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to disconnect", 500);
}
