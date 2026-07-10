"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, KeyRound, XCircle } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import { PageSection, StatusPill } from "@/components/ui/enterprise";
import { useToast } from "@/components/ui/toast";

interface ProviderRow {
  provider: string;
  configured: boolean;
  connected: boolean;
  email?: string;
  name?: string;
  missing: string[];
}

const LABELS: Record<string, string> = {
  "google-drive": "Google Drive",
  onedrive: "OneDrive",
  facebook: "Facebook Lead Ads",
  "google-ads": "Google Ads",
};

const REDIRECTS: Record<string, string> = {
  "google-drive": "/api/oauth/google-drive/callback",
  onedrive: "/api/oauth/onedrive/callback",
  facebook: "/api/oauth/facebook/callback",
  "google-ads": "/api/oauth/google-ads/callback",
};

export default function IntegrationsSetupClient() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [appUrl, setAppUrl] = useState("http://localhost:3000");

  useEffect(() => {
    void fetch("/api/integrations/status")
      .then((r) => r.json())
      .then((data: { appUrl?: string; providers: ProviderRow[] }) => {
        setProviders(data.providers ?? []);
        if (data.appUrl) setAppUrl(data.appUrl);
      });
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      showToast({ title: "OAuth error", description: err, variant: "error" });
    }
  }, [searchParams, showToast]);

  return (
    <AppPage
      title="OAuth credentials"
      eyebrow="Integrations setup"
      description="Add real Google, Microsoft, and Meta keys — then Connect works with your accounts"
    >
      <div className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4 text-[13px] text-[var(--ge-text-secondary)]">
        <p className="font-semibold text-[var(--ge-text)]">Your job (one-time)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Create apps in Google Cloud, Microsoft Entra, and Meta Developer.</li>
          <li>
            Paste Client IDs / Secrets into <code className="text-[12px]">.env.local</code>.
          </li>
          <li>
            Set <code className="text-[12px]">NEXT_PUBLIC_APP_URL={appUrl}</code> (use your Vercel
            URL in production).
          </li>
          <li>
            Restart <code className="text-[12px]">npm run dev</code>, then click Connect.
          </li>
        </ol>
        <p className="mt-3">
          Full checklist lives in the repo at{" "}
          <code className="text-[12px]">docs/INTEGRATIONS.md</code> (same steps as below).
        </p>
      </div>

      <PageSection title="Live status" description="Configured = keys present · Connected = you signed in">
        <div className="space-y-2">
          {providers.map((p) => (
            <div
              key={p.provider}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ge-border)] bg-[var(--ge-panel)] px-4 py-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-[var(--ge-text)]">
                  {LABELS[p.provider] || p.provider}
                </p>
                <p className="text-[12px] text-[var(--ge-text-muted)]">
                  {p.connected
                    ? p.email || p.name || "Signed in"
                    : p.configured
                      ? "Keys OK — not connected yet"
                      : `Missing: ${p.missing.join(", ") || "credentials"}`}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[var(--ge-text-muted)]">
                  Redirect: {appUrl}
                  {REDIRECTS[p.provider]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.configured ? (
                  <StatusPill label="Configured" tone="success" />
                ) : (
                  <StatusPill label="Keys missing" tone="warning" />
                )}
                {p.connected ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ge-text-muted)]">
                    <XCircle className="h-3.5 w-3.5" /> Not connected
                  </span>
                )}
                {p.configured && !p.connected ? (
                  <a
                    href={`/api/oauth/${p.provider}/start?returnTo=/settings/integrations`}
                    className="ge-btn-primary px-3 py-1.5 text-[12px]"
                  >
                    Connect
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Make Google work for EVERY visitor (not only you)"
        description="Testing mode = only Test users. Public = Publish + Verification"
      >
        <div className="space-y-3 text-[13px] text-[var(--ge-text-secondary)]">
          <p>
            The <strong className="text-[var(--ge-text)]">403 access_denied</strong> error means the
            OAuth app is still in <strong className="text-[var(--ge-text)]">Testing</strong>. Random
            visitors cannot connect until you do the steps below.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)]"
              >
                OAuth consent screen <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              App information → set{" "}
              <strong className="text-[var(--ge-text)]">Application home page</strong> to{" "}
              <code className="text-[11px]">https://growease.vercel.app</code>
            </li>
            <li>
              <strong className="text-[var(--ge-text)]">Privacy policy</strong>:{" "}
              <a
                href="https://growease.vercel.app/privacy"
                className="font-semibold text-[var(--ge-accent)]"
                target="_blank"
                rel="noreferrer"
              >
                https://growease.vercel.app/privacy
              </a>{" "}
              · <strong className="text-[var(--ge-text)]">Terms</strong>:{" "}
              <a
                href="https://growease.vercel.app/terms"
                className="font-semibold text-[var(--ge-accent)]"
                target="_blank"
                rel="noreferrer"
              >
                https://growease.vercel.app/terms
              </a>
            </li>
            <li>
              Authorized domains: add <code className="text-[11px]">growease.vercel.app</code> and{" "}
              <code className="text-[11px]">vercel.app</code>
            </li>
            <li>
              Click <strong className="text-[var(--ge-text)]">Publish app</strong> → Confirm (moves
              from Testing → In production)
            </li>
            <li>
              Because Drive / Ads scopes are <strong className="text-[var(--ge-text)]">sensitive</strong>,
              also click <strong className="text-[var(--ge-text)]">Prepare for verification</strong> /
              submit verification (demo video + explain why you need Drive read + Ads). Until Google
              approves, non-testers may still see a warning or be blocked for those scopes.
            </li>
            <li>
              On the OAuth client, add production redirect URIs:
              <ul className="mt-1 list-disc pl-5 font-mono text-[11px]">
                <li>https://growease.vercel.app/api/oauth/google-drive/callback</li>
                <li>https://growease.vercel.app/api/oauth/google-ads/callback</li>
              </ul>
            </li>
            <li>
              In Vercel → Environment Variables, set the same{" "}
              <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> and{" "}
              <code>NEXT_PUBLIC_APP_URL=https://growease.vercel.app</code>, then redeploy.
            </li>
          </ol>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <strong>Until verification is approved:</strong> keep adding reviewer emails under{" "}
            <em>Test users</em> (up to 100). That is the only way Google allows Drive/Ads access for
            unverified apps.
          </p>
        </div>
      </PageSection>

      <PageSection title="1 · Google (Drive + Ads)" description="One OAuth client covers both">
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-[var(--ge-text-secondary)]">
          <li>
            Open{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)]"
            >
              Google Cloud Console <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            Create a project → enable <strong>Google Drive API</strong> and{" "}
            <strong>Google Ads API</strong>.
          </li>
          <li>
            Credentials → <strong>OAuth client ID</strong> → Application type{" "}
            <strong>Web application</strong>.
          </li>
          <li>
            Authorized JavaScript origins: <code className="text-[12px]">{appUrl}</code> and{" "}
            <code className="text-[12px]">https://growease.vercel.app</code>
          </li>
          <li>
            Authorized redirect URIs (localhost + production):
            <ul className="mt-1 list-disc pl-5 font-mono text-[11px]">
              <li>{appUrl}/api/oauth/google-drive/callback</li>
              <li>{appUrl}/api/oauth/google-ads/callback</li>
              <li>https://growease.vercel.app/api/oauth/google-drive/callback</li>
              <li>https://growease.vercel.app/api/oauth/google-ads/callback</li>
            </ul>
          </li>
          <li>
            Copy Client ID + Secret into <code>.env.local</code> / Vercel as{" "}
            <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code>.
          </li>
          <li>
            Optional for listing Ads customers: <code>GOOGLE_ADS_DEVELOPER_TOKEN</code> from Google
            Ads → Tools → API Center.
          </li>
        </ol>
      </PageSection>

      <PageSection title="2 · Microsoft OneDrive" description="Entra ID app registration">
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-[var(--ge-text-secondary)]">
          <li>
            Open{" "}
            <a
              href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)]"
            >
              Microsoft Entra app registrations <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            New registration → Accounts in any org + personal Microsoft accounts.
          </li>
          <li>
            Authentication → Add platform <strong>Web</strong> → Redirect URI:{" "}
            <code className="text-[11px]">
              {appUrl}/api/oauth/onedrive/callback
            </code>
          </li>
          <li>
            Certificates & secrets → New client secret → copy value.
          </li>
          <li>
            API permissions → Microsoft Graph delegated:{" "}
            <code>User.Read</code>, <code>Files.Read</code>, <code>offline_access</code>.
          </li>
          <li>
            Overview → Application (client) ID →{" "}
            <code>MICROSOFT_CLIENT_ID</code> / <code>MICROSOFT_CLIENT_SECRET</code> in{" "}
            <code>.env.local</code>.
          </li>
        </ol>
      </PageSection>

      <PageSection title="3 · Meta Facebook Lead Ads" description="Developer app + Login">
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-[var(--ge-text-secondary)]">
          <li>
            Open{" "}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)]"
            >
              Meta for Developers <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Create app → use case with Marketing / Lead Ads (or Business type).</li>
          <li>Add product <strong>Facebook Login</strong>.</li>
          <li>
            Facebook Login → Settings → Valid OAuth Redirect URIs:{" "}
            <code className="text-[11px]">
              {appUrl}/api/oauth/facebook/callback
            </code>
          </li>
          <li>
            Settings → Basic → copy App ID / App Secret →{" "}
            <code>FACEBOOK_APP_ID</code> / <code>FACEBOOK_APP_SECRET</code>.
          </li>
          <li>
            In Development mode, add yourself as Admin/Developer/Tester. For other users, submit App
            Review for <code>leads_retrieval</code>, <code>pages_show_list</code>,{" "}
            <code>pages_manage_ads</code>.
          </li>
          <li>
            Ensure your Facebook Page has Lead Access for this app (Business Manager → Integrations →
            Leads Access).
          </li>
        </ol>
      </PageSection>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--ge-radius-lg)] border border-dashed border-[var(--ge-border)] bg-[var(--ge-surface)] p-4">
        <KeyRound className="h-5 w-5 text-[var(--ge-accent)]" />
        <p className="flex-1 text-[13px] text-[var(--ge-text-secondary)]">
          After saving <code>.env.local</code>, restart the dev server. Never commit secrets. On
          Vercel, add the same vars in Project → Settings → Environment Variables.
        </p>
        <Link href="/lead-sources" className="ge-btn-secondary px-3 py-2 text-[12px]">
          Try Drive import
        </Link>
        <Link href="/integrations/ads" className="ge-btn-primary px-3 py-2 text-[12px]">
          Connect ads
        </Link>
      </div>
    </AppPage>
  );
}
