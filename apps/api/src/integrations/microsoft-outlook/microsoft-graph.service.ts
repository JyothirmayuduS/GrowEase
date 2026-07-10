import { createHash, randomBytes } from "crypto";

import { getEnv, isMicrosoftConfigured } from "../../config/env";
import { ErrorCodes, ExternalServiceError, OAuthError } from "../../utils/errors";
import { consumeOAuthState, createOAuthState, generatePkce } from "../../services/security/oauth-state";
import {
  decryptTokens,
  disconnectIntegration,
  getIntegration,
  requireIntegration,
  upsertIntegration,
} from "../../repositories/integration-repository";
import { assertCsvUpload } from "../../services/csv/parse-csv";
import { importPipeline } from "../../services/import/import-pipeline";
import type { IntegrationProvider } from "../../types/domain";

type MsProvider = Extract<IntegrationProvider, "microsoft_outlook" | "onedrive">;

function tenantBase(): string {
  return `https://login.microsoftonline.com/${getEnv().MICROSOFT_TENANT_ID}`;
}

function scopesFor(provider: MsProvider): string {
  if (provider === "microsoft_outlook") {
    return "openid profile email offline_access User.Read Mail.Read";
  }
  return "openid profile email offline_access User.Read Files.Read";
}

function redirectFor(provider: MsProvider): string {
  const env = getEnv();
  return provider === "microsoft_outlook"
    ? env.MICROSOFT_OUTLOOK_REDIRECT_URI
    : env.MICROSOFT_ONEDRIVE_REDIRECT_URI;
}

export async function startMicrosoftConnect(userId: string, provider: MsProvider) {
  if (!isMicrosoftConfigured()) {
    throw new OAuthError(ErrorCodes.NOT_CONFIGURED, "Microsoft OAuth is not configured");
  }
  const { verifier, challenge } = generatePkce();
  const { state } = await createOAuthState({
    userId,
    provider,
    codeVerifier: verifier,
  });
  const env = getEnv();
  const url = new URL(`${tenantBase()}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", env.MICROSOFT_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectFor(provider));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", scopesFor(provider));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { url: url.toString() };
}

export async function handleMicrosoftCallback(
  provider: MsProvider,
  code: string,
  state: string
) {
  const { userId, codeVerifier } = await consumeOAuthState({ state, provider });
  const env = getEnv();
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: redirectFor(provider),
    grant_type: "authorization_code",
    scope: scopesFor(provider),
  });
  if (codeVerifier) body.set("code_verifier", codeVerifier);

  const tokenRes = await fetch(`${tenantBase()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    throw new OAuthError(ErrorCodes.MICROSOFT_OAUTH_DENIED, "Microsoft token exchange failed");
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = meRes.ok
    ? ((await meRes.json()) as {
        id?: string;
        mail?: string;
        userPrincipalName?: string;
      })
    : {};

  await upsertIntegration({
    userId,
    provider,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiry: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
    accountEmail: me.mail || me.userPrincipalName,
    providerAccountId: me.id,
    scopes: (tokens.scope || scopesFor(provider)).split(/\s+/),
  });
  return { userId, email: me.mail || me.userPrincipalName };
}

async function getMsAccessToken(userId: string, provider: MsProvider): Promise<string> {
  const row = await requireIntegration(userId, provider);
  const { accessToken, refreshToken } = decryptTokens(row);
  const expired =
    row.token_expiry && new Date(row.token_expiry).getTime() < Date.now() + 60_000;
  if (!expired) return accessToken;
  if (!refreshToken) {
    throw new ExternalServiceError(ErrorCodes.MICROSOFT_TOKEN_EXPIRED, "Microsoft token expired");
  }
  const env = getEnv();
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: scopesFor(provider),
  });
  const res = await fetch(`${tenantBase()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new ExternalServiceError(ErrorCodes.MICROSOFT_TOKEN_EXPIRED, "Microsoft refresh failed");
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  await upsertIntegration({
    userId,
    provider,
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    tokenExpiry: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    accountEmail: row.account_email || undefined,
    providerAccountId: row.provider_account_id || undefined,
    scopes: row.scopes,
  });
  return json.access_token;
}

export async function microsoftStatus(userId: string, provider: MsProvider) {
  const row = await getIntegration(userId, provider);
  return {
    configured: isMicrosoftConfigured(),
    connected: row?.status === "connected",
    email: row?.account_email ?? null,
  };
}

export async function listOutlookMessages(userId: string) {
  const token = await getMsAccessToken(userId, "microsoft_outlook");
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages?$top=25&$select=id,subject,from,receivedDateTime,hasAttachments&$filter=hasAttachments eq true&$orderby=receivedDateTime desc",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new ExternalServiceError(ErrorCodes.OUTLOOK_ACCESS_REVOKED, "Failed to list messages");
  }
  const data = (await res.json()) as { value?: unknown[] };
  return data.value ?? [];
}

export async function listOutlookAttachments(userId: string, messageId: string) {
  const token = await getMsAccessToken(userId, "microsoft_outlook");
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new ExternalServiceError(
      ErrorCodes.OUTLOOK_MESSAGE_NOT_FOUND,
      "Message or attachments not found"
    );
  }
  const data = (await res.json()) as {
    value?: Array<{ id: string; name: string; contentType?: string; size?: number }>;
  };
  return (data.value ?? []).filter(
    (a) =>
      a.name?.toLowerCase().endsWith(".csv") ||
      (a.contentType || "").includes("csv") ||
      (a.contentType || "").includes("text/plain")
  );
}

export async function importOutlookAttachment(
  userId: string,
  messageId: string,
  attachmentId: string
) {
  const token = await getMsAccessToken(userId, "microsoft_outlook");
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new ExternalServiceError(
      ErrorCodes.OUTLOOK_ATTACHMENT_NOT_FOUND,
      "Attachment not found"
    );
  }
  const att = (await res.json()) as {
    name?: string;
    contentType?: string;
    contentBytes?: string;
    size?: number;
  };
  if (!att.contentBytes) {
    throw new ExternalServiceError(
      ErrorCodes.OUTLOOK_ATTACHMENT_DOWNLOAD_FAILED,
      "Attachment has no content"
    );
  }
  const buffer = Buffer.from(att.contentBytes, "base64");
  const filename = att.name || "outlook.csv";
  assertCsvUpload({
    originalname: filename,
    mimetype: att.contentType || "text/csv",
    size: buffer.byteLength,
    buffer,
  });

  // Fetch message meta for source_metadata
  const msgRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,receivedDateTime`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const msg = msgRes.ok ? await msgRes.json() : {};

  return importPipeline.run({
    userId,
    sourceType: "outlook_attachment",
    filename,
    fileBuffer: buffer,
    sourceMetadata: {
      messageId,
      attachmentId,
      subject: (msg as { subject?: string }).subject,
      from: (msg as { from?: unknown }).from,
      receivedDateTime: (msg as { receivedDateTime?: string }).receivedDateTime,
    },
  });
}

export async function listOneDriveFiles(userId: string) {
  const token = await getMsAccessToken(userId, "onedrive");
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/drive/root/search(q='.csv')?$top=50&$select=id,name,size,lastModifiedDateTime,webUrl,file",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new ExternalServiceError(ErrorCodes.ONEDRIVE_DOWNLOAD_FAILED, "Failed to list OneDrive files");
  }
  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      name: string;
      size?: number;
      lastModifiedDateTime?: string;
      file?: { mimeType?: string };
    }>;
  };
  return (data.value ?? []).filter((f) => f.name?.toLowerCase().endsWith(".csv"));
}

export async function importOneDriveFile(userId: string, fileId: string) {
  const token = await getMsAccessToken(userId, "onedrive");
  const metaRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}?$select=id,name,size`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) {
    throw new ExternalServiceError(ErrorCodes.ONEDRIVE_FILE_NOT_FOUND, "OneDrive file not found");
  }
  const meta = (await metaRes.json()) as { id: string; name: string; size?: number };
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`,
    { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" }
  );
  if (!res.ok) {
    throw new ExternalServiceError(ErrorCodes.ONEDRIVE_DOWNLOAD_FAILED, "OneDrive download failed");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  assertCsvUpload({
    originalname: meta.name,
    mimetype: "text/csv",
    size: buffer.byteLength,
    buffer,
  });
  return importPipeline.run({
    userId,
    sourceType: "onedrive",
    filename: meta.name,
    fileBuffer: buffer,
    sourceMetadata: { oneDriveFileId: meta.id, size: meta.size },
  });
}

export async function disconnectMicrosoft(userId: string, provider: MsProvider) {
  await disconnectIntegration(userId, provider);
}

/** Unused helpers kept for PKCE clarity in tests */
export function sha256Base64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

export function randomState(): string {
  return randomBytes(16).toString("hex");
}
