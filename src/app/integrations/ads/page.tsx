import Link from "next/link";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";

export const metadata = { title: "Ad Accounts — GrowEasy CRM" };

export default function AdAccountsPage() {
  return (
    <AppPage
      title="Connected accounts"
      eyebrow="Ad Accounts"
      description="Facebook & Google lead sources for Generate Leads"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Connected" value={1} tone="success" />
        <MetricCard label="Forms syncing" value={3} />
        <MetricCard label="Leads (7d)" value={64} tone="accent" />
      </div>

      <PageSection
        title="Accounts"
        description="OAuth connections for Lead Ads / Google Ads"
        action={
          <button type="button" className="ge-btn-primary px-3 py-1.5 text-[12px]">
            Connect account
          </button>
        }
      >
        <EnterpriseTable
          headers={["Platform", "Account", "Status", "Last sync"]}
          rows={[
            [
              "Facebook",
              "GrowEasy RE — Main",
              <StatusPill key="fb" label="Connected" tone="success" />,
              "2 hours ago",
            ],
            [
              "Google Ads",
              "Not connected",
              <StatusPill key="g" label="Setup required" tone="warning" />,
              "—",
            ],
          ]}
        />
      </PageSection>

      <p className="text-[13px] text-[var(--ge-text-secondary)]">
        Prefer a one-off file?{" "}
        <Link href="/lead-sources" className="font-semibold text-[var(--ge-accent)] hover:underline">
          Import CSV in Lead Sources
        </Link>
        .
      </p>
    </AppPage>
  );
}
