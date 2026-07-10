import Link from "next/link";

import { AppPage } from "@/components/layout/AppPage";
import { MetricCard, PageSection } from "@/components/ui/enterprise";

export const metadata = { title: "Business Center — GrowEasy CRM" };

export default function BusinessCenterPage() {
  return (
    <AppPage
      title="Workspace"
      eyebrow="Business center"
      description="Plan, billing, and org settings for Test Corp"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Plan" value="Growth" tone="accent" hint="CSV AI importer included" />
        <MetricCard label="Seats" value="4 / 10" />
        <MetricCard label="AI imports (mo)" value="128" hint="Soft cap 2,000 rows / file" />
      </div>

      <PageSection title="Shortcuts" description="Jump to control-center tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/settings/team", title: "Team Members", body: "Invite agents & owners" },
            { href: "/settings/crm-fields", title: "CRM Fields", body: "Schema & enums" },
            { href: "/settings/api", title: "API Center", body: "Health & endpoints" },
            { href: "/lead-sources", title: "Lead Sources", body: "CSV AI importer" },
            { href: "/integrations/ads", title: "Ad Accounts", body: "FB / Google" },
            { href: "/dashboard", title: "Dashboard", body: "Pipeline overview" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4 transition-colors hover:border-[var(--ge-border-strong)]"
            >
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">{item.title}</p>
              <p className="mt-1 text-[12.5px] text-[var(--ge-text-secondary)]">{item.body}</p>
            </Link>
          ))}
        </div>
      </PageSection>
    </AppPage>
  );
}
