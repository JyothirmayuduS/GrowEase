"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Link2,
  Loader2,
  RefreshCw,
  Unplug,
  X,
} from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { useToast } from "@/components/ui/toast";

type Platform = "facebook" | "google";

interface ProviderStatus {
  provider: string;
  configured: boolean;
  connected: boolean;
  email?: string;
  name?: string;
  missing: string[];
}

interface FbForm {
  id: string;
  name: string;
  status?: string;
  leads_count?: number;
}

interface FbPage {
  id: string;
  name: string;
  forms: FbForm[];
}

interface GoogleCustomer {
  customerId: string;
  resourceName: string;
}

export default function AdAccountsClient() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const titleId = useId();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [fbPages, setFbPages] = useState<FbPage[]>([]);
  const [googleCustomers, setGoogleCustomers] = useState<GoogleCustomer[]>([]);
  const [googleNote, setGoogleNote] = useState<string | null>(null);

  const facebook = providers.find((p) => p.provider === "facebook");
  const googleAds = providers.find((p) => p.provider === "google-ads");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await fetch("/api/integrations/status");
      const status = (await statusRes.json()) as { providers: ProviderStatus[] };
      setProviders(status.providers ?? []);

      const fb = status.providers?.find((p) => p.provider === "facebook");
      const gads = status.providers?.find((p) => p.provider === "google-ads");

      if (fb?.connected) {
        const pagesRes = await fetch("/api/integrations/facebook/pages");
        if (pagesRes.ok) {
          const body = (await pagesRes.json()) as { pages: FbPage[] };
          setFbPages(body.pages ?? []);
        } else {
          setFbPages([]);
        }
      } else {
        setFbPages([]);
      }

      if (gads?.connected) {
        const adsRes = await fetch("/api/integrations/google-ads/accounts");
        if (adsRes.ok) {
          const body = (await adsRes.json()) as {
            customers: GoogleCustomer[];
            note?: string;
          };
          setGoogleCustomers(body.customers ?? []);
          setGoogleNote(body.note ?? null);
        } else {
          setGoogleCustomers([]);
          setGoogleNote(null);
        }
      } else {
        setGoogleCustomers([]);
        setGoogleNote(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected === "facebook" || connected === "google-ads") {
      showToast({
        title:
          connected === "facebook" ? "Facebook connected" : "Google Ads connected",
        description: "Your real OAuth session is saved securely.",
        variant: "success",
      });
      void load();
      window.history.replaceState({}, "", "/integrations/ads");
    }
  }, [searchParams, showToast, load]);

  const formsCount = useMemo(
    () => fbPages.reduce((sum, p) => sum + p.forms.length, 0),
    [fbPages]
  );
  const leads7d = useMemo(
    () =>
      fbPages.reduce(
        (sum, p) => sum + p.forms.reduce((s, f) => s + (f.leads_count ?? 0), 0),
        0
      ),
    [fbPages]
  );
  const connectedCount =
    (facebook?.connected ? 1 : 0) + (googleAds?.connected ? 1 : 0);

  const disconnect = async (provider: "facebook" | "google-ads") => {
    setBusy(provider);
    await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setBusy(null);
    showToast({ title: "Disconnected", variant: "success" });
    void load();
  };

  const startOAuth = (platform: Platform) => {
    const provider = platform === "facebook" ? "facebook" : "google-ads";
    const row = providers.find((p) => p.provider === provider);
    if (!row?.configured) {
      window.location.href = `/settings/integrations?missing=${provider}`;
      return;
    }
    window.location.href = `/api/oauth/${provider}/start?returnTo=/integrations/ads`;
  };

  return (
    <AppPage
      title="Connected accounts"
      eyebrow="Ad Accounts"
      description="Facebook & Google lead sources for Generate Leads"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Ad platforms
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Real OAuth — connect your Meta and Google Ads accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/integrations"
            className="ge-btn-secondary px-3 py-2 text-[12px]"
          >
            Setup keys
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect account
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Connected" value={connectedCount} tone="success" />
        <MetricCard label="Lead forms" value={formsCount} />
        <MetricCard label="Leads (forms)" value={leads7d} tone="accent" />
      </div>

      <PageSection title="Accounts" description="Live OAuth connections">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-[13px] text-[var(--ge-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading connections…
          </div>
        ) : (
          <EnterpriseTable
            headers={["Platform", "Account", "Status", "Details", ""]}
            rows={[
              [
                "Facebook",
                facebook?.name || facebook?.email || "Not connected",
                facebook?.connected ? (
                  <StatusPill key="fb-s" label="Connected" tone="success" />
                ) : facebook?.configured ? (
                  <StatusPill key="fb-s" label="Setup required" tone="warning" />
                ) : (
                  <StatusPill key="fb-s" label="Keys missing" tone="warning" />
                ),
                facebook?.connected
                  ? `${fbPages.length} page(s) · ${formsCount} form(s)`
                  : facebook?.configured
                    ? "Authorize Meta Login"
                    : "Add FACEBOOK_APP_ID / SECRET",
                facebook?.connected ? (
                  <div key="fb-a" className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-text-secondary)]"
                    >
                      <RefreshCw className="h-3 w-3" /> Sync
                    </button>
                    <button
                      type="button"
                      disabled={busy === "facebook"}
                      onClick={() => void disconnect("facebook")}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-text-muted)] hover:text-red-600"
                    >
                      <Unplug className="h-3 w-3" /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    key="fb-c"
                    type="button"
                    onClick={() => startOAuth("facebook")}
                    className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
                  >
                    Connect
                  </button>
                ),
              ],
              [
                "Google Ads",
                googleAds?.name || googleAds?.email || "Not connected",
                googleAds?.connected ? (
                  <StatusPill key="g-s" label="Connected" tone="success" />
                ) : googleAds?.configured ? (
                  <StatusPill key="g-s" label="Setup required" tone="warning" />
                ) : (
                  <StatusPill key="g-s" label="Keys missing" tone="warning" />
                ),
                googleAds?.connected
                  ? googleCustomers.length
                    ? `${googleCustomers.length} customer(s)`
                    : googleNote || "OAuth OK"
                  : googleAds?.configured
                    ? "Authorize Google Ads"
                    : "Add GOOGLE_CLIENT_ID / SECRET",
                googleAds?.connected ? (
                  <div key="g-a" className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-text-secondary)]"
                    >
                      <RefreshCw className="h-3 w-3" /> Sync
                    </button>
                    <button
                      type="button"
                      disabled={busy === "google-ads"}
                      onClick={() => void disconnect("google-ads")}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-text-muted)] hover:text-red-600"
                    >
                      <Unplug className="h-3 w-3" /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    key="g-c"
                    type="button"
                    onClick={() => startOAuth("google")}
                    className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
                  >
                    Connect
                  </button>
                ),
              ],
            ]}
          />
        )}
      </PageSection>

      {fbPages.length > 0 ? (
        <PageSection title="Facebook lead forms" description="From your connected Pages">
          <EnterpriseTable
            headers={["Form", "Page", "Leads", "Status"]}
            rows={fbPages.flatMap((page) =>
              page.forms.map((form) => [
                form.name,
                page.name,
                String(form.leads_count ?? "—"),
                <StatusPill
                  key={form.id}
                  label={form.status || "Live"}
                  tone="success"
                />,
              ])
            )}
          />
        </PageSection>
      ) : null}

      {googleCustomers.length > 0 ? (
        <PageSection title="Google Ads customers" description="Accessible via your OAuth token">
          <EnterpriseTable
            headers={["Customer ID", "Resource"]}
            rows={googleCustomers.map((c) => [c.customerId, c.resourceName])}
          />
        </PageSection>
      ) : null}

      <p className="text-[13px] text-[var(--ge-text-secondary)]">
        Prefer a one-off file?{" "}
        <Link
          href="/lead-sources"
          className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)] hover:underline"
        >
          Import CSV in Lead Sources <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--ge-border)] bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-[var(--ge-border)] px-5 py-4">
              <div>
                <h2 id={titleId} className="text-[15px] font-semibold text-[var(--ge-text)]">
                  Connect ad account
                </h2>
                <p className="text-[12px] text-[var(--ge-text-muted)]">
                  Real OAuth with Meta / Google
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-[var(--ge-text-muted)] hover:bg-[var(--ge-surface)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 p-5">
              {(
                [
                  {
                    platform: "facebook" as const,
                    label: "Facebook",
                    body: "Lead Ads forms & pages",
                    connected: facebook?.connected,
                    configured: facebook?.configured,
                  },
                  {
                    platform: "google" as const,
                    label: "Google Ads",
                    body: "Ads account OAuth",
                    connected: googleAds?.connected,
                    configured: googleAds?.configured,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.platform}
                  type="button"
                  disabled={item.connected}
                  onClick={() => startOAuth(item.platform)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--ge-border)] bg-[var(--ge-panel)] px-4 py-3 text-left transition-colors hover:border-[var(--ge-border-strong)] disabled:opacity-70"
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-[var(--ge-text)]">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[var(--ge-text-muted)]">
                      {!item.configured
                        ? "Add API keys first"
                        : item.connected
                          ? "Already connected"
                          : item.body}
                    </span>
                  </span>
                  {item.connected ? (
                    <StatusPill label="Connected" tone="success" />
                  ) : (
                    <span className="text-[12px] font-semibold text-[var(--ge-accent)]">
                      {item.configured ? "Authorize" : "Setup"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AppPage>
  );
}
