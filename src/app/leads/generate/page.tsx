import Link from "next/link";
import {
  ArrowRight,
  Globe,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_CAMPAIGNS } from "@/lib/demo/seed-data";

export const metadata = {
  title: "Generate Leads",
};

export default function GenerateLeadsPage() {
  return (
    <AppPage
      title="Campaigns"
      eyebrow="Generate Leads"
      description="Demand-gen channels feeding GrowEasy CRM — ads, WhatsApp, and CSV"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Lead generation
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Launch campaigns, connect ad accounts, or import messy CSVs with AI mapping.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/integrations/ads"
            className="ge-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
          >
            <Plus className="h-3.5 w-3.5" />
            New campaign
          </Link>
          <Link
            href="/lead-sources"
            className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Import CSV with AI
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Live campaigns" value={2} tone="success" hint="FB + Google" />
        <MetricCard label="Leads (30d)" value={255} hint="Across all channels" />
        <MetricCard label="Avg CPL" value="₹41" tone="accent" hint="Blended" />
        <MetricCard label="Conversion" value="12%" hint="Visit → token" />
      </div>

      <PageSection
        title="Active campaigns"
        description="Performance by channel — connect accounts to sync spend live"
        action={
          <Link
            href="/integrations/ads"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
          >
            Manage ad accounts <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <EnterpriseTable
          headers={["Campaign", "Channel", "Status", "Leads", "CPL", ""]}
          rows={DEMO_CAMPAIGNS.map((c) => [
            <div key={c.name}>
              <p className="font-semibold text-[var(--ge-text)]">{c.name}</p>
              <p className="text-[11px] text-[var(--ge-text-muted)]">Last 30 days</p>
            </div>,
            <span key={`${c.name}-ch`} className="inline-flex items-center gap-1.5">
              {c.channel === "Facebook" ? (
                <Share2 className="h-3.5 w-3.5 text-[var(--ge-accent)]" />
              ) : c.channel === "WhatsApp" ? (
                <MessageCircle className="h-3.5 w-3.5 text-[var(--ge-success)]" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-[var(--ge-text-muted)]" />
              )}
              {c.channel}
            </span>,
            <StatusPill
              key={`${c.name}-s`}
              label={c.status}
              tone={c.status === "Live" ? "success" : "muted"}
            />,
            <span key={`${c.name}-l`} className="font-mono font-semibold tabular-nums">
              {c.leads}
            </span>,
            c.cpl,
            <Link
              key={`${c.name}-a`}
              href="/leads"
              className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
            >
              View leads
            </Link>,
          ])}
        />
      </PageSection>

      <PageSection title="Acquisition channels" description="Where new leads enter GrowEasy">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Share2,
              title: "Facebook Lead Ads",
              body: "Map form fields with AI — full_name, phone_number, created_time.",
              href: "/integrations/ads",
              cta: "Connect Facebook",
              tone: "accent" as const,
            },
            {
              icon: MessageCircle,
              title: "WhatsApp / agent sheets",
              body: "Naam, Mob, Hyd/Vizag nicknames — import messy WA lists.",
              href: "/lead-sources",
              cta: "Import sheet",
              tone: "success" as const,
            },
            {
              icon: Target,
              title: "Zoho / CRM export",
              body: "Lead Name, Lead Status, Lead Source — synonym-mapped to enums.",
              href: "/lead-sources",
              cta: "Upload export",
              tone: "warning" as const,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--ge-radius-md)] bg-[var(--ge-card)] border border-[var(--ge-border)]">
                  <Icon className="h-4 w-4 text-[var(--ge-text)]" />
                </div>
                <p className="text-[14px] font-semibold text-[var(--ge-text)]">{card.title}</p>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-[var(--ge-text-secondary)]">
                  {card.body}
                </p>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
                >
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </PageSection>

      <PageSection
        title="This week’s pipeline"
        description="Illustrative funnel for RE lead gen"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "New leads", value: "86", sub: "+12% vs last week" },
            { label: "Site visits", value: "19", sub: "22% of new" },
            { label: "Tokens", value: "4", sub: "₹48L pipeline" },
            { label: "Sales done", value: "2", sub: "Meridian + Sarjapur" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-card)] px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
                {s.label}
              </p>
              <p className="mt-1 font-display text-[24px] font-semibold tabular-nums text-[var(--ge-text)]">
                {s.value}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--ge-success)]">
                <TrendingUp className="h-3 w-3" />
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </PageSection>
    </AppPage>
  );
}
