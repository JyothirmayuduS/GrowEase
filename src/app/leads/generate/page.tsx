import Link from "next/link";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_CAMPAIGNS } from "@/lib/demo/seed-data";

export const metadata = {
  title: "Generate Leads — GrowEasy CRM",
};

export default function GenerateLeadsPage() {
  return (
    <AppPage
      title="Campaigns"
      eyebrow="Generate Leads"
      description="Demand-gen channels feeding GrowEasy CRM"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Live campaigns" value={2} tone="success" />
        <MetricCard label="Leads (30d)" value={255} hint="Across FB + Google + WA" />
        <MetricCard label="Avg CPL" value="₹41" tone="accent" />
      </div>

      <PageSection
        title="Active campaigns"
        description="Connect ad accounts to sync spend and lead volume"
        action={
          <Link href="/integrations/ads" className="ge-btn-secondary px-3 py-1.5 text-[12px]">
            Manage ad accounts
          </Link>
        }
      >
        <EnterpriseTable
          headers={["Campaign", "Channel", "Status", "Leads", "CPL"]}
          rows={DEMO_CAMPAIGNS.map((c) => [
            <span key={c.name} className="font-semibold">
              {c.name}
            </span>,
            c.channel,
            <StatusPill
              key={`${c.name}-s`}
              label={c.status}
              tone={c.status === "Live" ? "success" : "muted"}
            />,
            <span key={`${c.name}-l`} className="font-mono tabular-nums">
              {c.leads}
            </span>,
            c.cpl,
          ])}
        />
      </PageSection>

      <PageSection title="Quick actions" description="Common generation workflows">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Import CSV leads",
              body: "Facebook, Zoho, WhatsApp sheets — AI maps to CRM.",
              href: "/lead-sources",
              cta: "Open Lead Sources",
            },
            {
              title: "Connect Facebook Ads",
              body: "Pull Lead Ads forms into GrowEasy automatically.",
              href: "/integrations/ads",
              cta: "Ad Accounts",
            },
            {
              title: "WhatsApp capture",
              body: "Route WA replies into Engage Leads queues.",
              href: "/integrations/whatsapp",
              cta: "WhatsApp Account",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4"
            >
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">{card.title}</p>
              <p className="mt-1 text-[12.5px] text-[var(--ge-text-secondary)]">{card.body}</p>
              <Link
                href={card.href}
                className="mt-3 inline-block text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
              >
                {card.cta} →
              </Link>
            </div>
          ))}
        </div>
      </PageSection>
    </AppPage>
  );
}
