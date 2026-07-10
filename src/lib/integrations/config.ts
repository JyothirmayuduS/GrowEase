/**
 * Integration OAuth config — reads from env.
 * When a provider's client id/secret are missing, UI shows setup instructions.
 */

export type OAuthProvider =
  | "google-drive"
  | "onedrive"
  | "facebook"
  | "google-ads";

export function appBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  return "http://localhost:3000";
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return `${appBaseUrl()}/api/oauth/${provider}/callback`;
}

export function getIntegrationSecret(): string {
  const secret =
    process.env.INTEGRATION_SECRET ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    "groweasy-dev-integration-secret-change-me";
  return secret.slice(0, 64).padEnd(32, "0");
}

export interface ProviderConfig {
  configured: boolean;
  clientId: string | null;
  clientSecret: string | null;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  extraAuthParams?: Record<string, string>;
  missing: string[];
}

export function getProviderConfig(provider: OAuthProvider): ProviderConfig {
  switch (provider) {
    case "google-drive": {
      const clientId = process.env.GOOGLE_CLIENT_ID ?? null;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? null;
      const missing: string[] = [];
      if (!clientId) missing.push("GOOGLE_CLIENT_ID");
      if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
      return {
        configured: Boolean(clientId && clientSecret),
        clientId,
        clientSecret,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/drive.readonly",
        ],
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        extraAuthParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
        missing,
      };
    }
    case "google-ads": {
      const clientId = process.env.GOOGLE_CLIENT_ID ?? null;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? null;
      const missing: string[] = [];
      if (!clientId) missing.push("GOOGLE_CLIENT_ID");
      if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
      return {
        configured: Boolean(clientId && clientSecret),
        clientId,
        clientSecret,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/adwords",
        ],
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        extraAuthParams: {
          access_type: "offline",
          prompt: "consent",
        },
        missing,
      };
    }
    case "onedrive": {
      const clientId = process.env.MICROSOFT_CLIENT_ID ?? null;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? null;
      const missing: string[] = [];
      if (!clientId) missing.push("MICROSOFT_CLIENT_ID");
      if (!clientSecret) missing.push("MICROSOFT_CLIENT_SECRET");
      return {
        configured: Boolean(clientId && clientSecret),
        clientId,
        clientSecret,
        scopes: ["openid", "email", "profile", "offline_access", "Files.Read", "User.Read"],
        authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        extraAuthParams: {
          response_mode: "query",
        },
        missing,
      };
    }
    case "facebook": {
      const clientId = process.env.FACEBOOK_APP_ID ?? null;
      const clientSecret = process.env.FACEBOOK_APP_SECRET ?? null;
      const missing: string[] = [];
      if (!clientId) missing.push("FACEBOOK_APP_ID");
      if (!clientSecret) missing.push("FACEBOOK_APP_SECRET");
      return {
        configured: Boolean(clientId && clientSecret),
        clientId,
        clientSecret,
        scopes: [
          "email",
          "public_profile",
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_ads",
          "leads_retrieval",
          "ads_read",
          "business_management",
        ],
        authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        missing,
      };
    }
  }
}

export function listProviderStatus() {
  const providers: OAuthProvider[] = [
    "google-drive",
    "onedrive",
    "facebook",
    "google-ads",
  ];
  return providers.map((provider) => {
    const cfg = getProviderConfig(provider);
    return {
      provider,
      configured: cfg.configured,
      missing: cfg.missing,
    };
  });
}
