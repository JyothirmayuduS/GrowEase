import { getEnv, isGoogleConfigured } from "../../config/env";
import { ErrorCodes, OAuthError, ExternalServiceError, ValidationError } from "../../utils/errors";
import { createOAuthState, consumeOAuthState } from "../../services/security/oauth-state";
import {
  decryptTokens,
  disconnectIntegration,
  getIntegration,
  requireIntegration,
  upsertIntegration,
} from "../../repositories/integration-repository";
import { assertCsvUpload } from "../../services/csv/parse-csv";
import { importPipeline } from "../../services/import/import-pipeline";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file openid email profile";

export function googleDriveAuthUrl(state: string): string {
  if (!isGoogleConfigured()) {
    throw new OAuthError(ErrorCodes.NOT_CONFIGURED, "Google Drive is not configured");
  }
  const env = getEnv();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_DRIVE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function startGoogleDriveConnect(userId: string) {
  const { state } = await createOAuthState({ userId, provider: "google_drive" });
  return { url: googleDriveAuthUrl(state) };
}

export async function handleGoogleDriveCallback(code: string, state: string) {
  const { userId } = await consumeOAuthState({ state, provider: "google_drive" });
  const env = getEnv();
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_DRIVE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    throw new OAuthError(ErrorCodes.GOOGLE_OAUTH_DENIED, "Google token exchange failed");
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok
    ? ((await profileRes.json()) as { email?: string; id?: string })
    : {};

  await upsertIntegration({
    userId,
    provider: "google_drive",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiry: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
    accountEmail: profile.email,
    providerAccountId: profile.id,
    scopes: (tokens.scope || DRIVE_SCOPE).split(/\s+/),
  });
  return { userId, email: profile.email };
}

async function getValidAccessToken(userId: string): Promise<string> {
  const row = await requireIntegration(userId, "google_drive");
  const { accessToken, refreshToken } = decryptTokens(row);
  const expired =
    row.token_expiry && new Date(row.token_expiry).getTime() < Date.now() + 60_000;
  if (!expired) return accessToken;
  if (!refreshToken) {
    throw new ExternalServiceError(ErrorCodes.GOOGLE_TOKEN_EXPIRED, "Google token expired");
  }
  const env = getEnv();
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new ExternalServiceError(ErrorCodes.GOOGLE_TOKEN_EXPIRED, "Google refresh failed");
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };
  await upsertIntegration({
    userId,
    provider: "google_drive",
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    tokenExpiry: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    accountEmail: row.account_email || undefined,
    providerAccountId: row.provider_account_id || undefined,
    scopes: row.scopes,
  });
  return json.access_token;
}

export async function googleDriveStatus(userId: string) {
  const row = await getIntegration(userId, "google_drive");
  return {
    configured: isGoogleConfigured(),
    connected: row?.status === "connected",
    email: row?.account_email ?? null,
  };
}

export async function listGoogleDriveFiles(userId: string) {
  const token = await getValidAccessToken(userId);
  const q = encodeURIComponent(
    "trashed=false and (mimeType='text/csv' or mimeType='application/vnd.google-apps.spreadsheet' or name contains '.csv')"
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size,modifiedTime)&q=${q}&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new ExternalServiceError(
      ErrorCodes.GOOGLE_DRIVE_DOWNLOAD_FAILED,
      "Failed to list Drive files"
    );
  }
  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; mimeType: string; size?: string; modifiedTime?: string }>;
  };
  return (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? Number(f.size) : undefined,
    modifiedTime: f.modifiedTime,
  }));
}

export async function importGoogleDriveFile(userId: string, fileId: string) {
  const token = await getValidAccessToken(userId);
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) {
    throw new ExternalServiceError(
      ErrorCodes.GOOGLE_DRIVE_FILE_NOT_FOUND,
      "Drive file not found"
    );
  }
  const meta = (await metaRes.json()) as {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
  };

  const downloadUrl =
    meta.mimeType === "application/vnd.google-apps.spreadsheet"
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/csv`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    throw new ExternalServiceError(
      ErrorCodes.GOOGLE_DRIVE_DOWNLOAD_FAILED,
      "Drive download failed"
    );
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const filename = meta.name.toLowerCase().endsWith(".csv") ? meta.name : `${meta.name}.csv`;
  assertCsvUpload({
    originalname: filename,
    mimetype: "text/csv",
    size: buffer.byteLength,
    buffer,
  });

  return importPipeline.run({
    userId,
    sourceType: "google_drive",
    filename,
    fileBuffer: buffer,
    sourceMetadata: {
      driveFileId: meta.id,
      mimeType: meta.mimeType,
      size: meta.size,
    },
  });
}

export async function disconnectGoogleDrive(userId: string) {
  await disconnectIntegration(userId, "google_drive");
}
