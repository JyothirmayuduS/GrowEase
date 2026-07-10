import Link from "next/link";
import { ArrowRight, Link2, RefreshCw } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";

export const metadata = { title: "Ad Accounts" };

export default function AdAccountsPage() {
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
            Sync Lead Ads forms — or import CSV exports anytime from Lead Sources.
          </p>
        </div>
        <button type="button" className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]">
          <Link2 className="h-3.5 w-3.5" />
          Connect account
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Connected" value={1} tone="success" />
        <MetricCard label="Forms syncing" value={3} />
        <MetricCard label="Leads (7d)" value={64} tone="accent" />
      </div>

      <PageSection title="Accounts" description="OAuth connections for Lead Ads / Google Ads">
        <EnterpriseTable
          headers={["Platform", "Account", "Status", "Last sync", ""]}
          rows={[
            [
              "Facebook",
              "GrowEasy RE — Main",
              <StatusPill key="fb" label="Connected" tone="success" />,
              "2 hours ago",
              <button
                key="fb-s"
                type="button"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-text-secondary)]"
              >
                <RefreshCw className="h-3 w-3" /> Sync
              </button>,
            ],
            [
              "Google Ads",
              "Not connected",
              <StatusPill key="g" label="Setup required" tone="warning" />,
              "—",
              <button
                key="g-c"
                type="button"
                className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
              >
                Connect
              </button>,
            ],
          ]}
        />
      </PageSection>

      <PageSection title="Lead forms" description="Mapped into GrowEasy CRM fields">
        <EnterpriseTable
          headers={["Form", "Platform", "Leads (7d)", "Status"]}
          rows={[
            ["Meridian Tower — Interest", "Facebook", "28", <StatusPill key="1" label="Live" tone="success" />],
            ["Sarjapur Plots — Brochure", "Facebook", "22", <StatusPill key="2" label="Live" tone="success" />],
            ["LOD — Callback", "Facebook", "14", <StatusPill key="3" label="Live" tone="success" />],
          ]}
        />
      </PageSection>

      <p className="text-[13px] text-[var(--ge-text-secondary)]">
        Prefer a one-off file?{" "}
        <Link href="/lead-sources" className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)] hover:underline">
          Import CSV in Lead Sources <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </AppPage>
  );
}
