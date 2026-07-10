"use client";

import Link from "next/link";
import { ArrowRight, Building2, CreditCard, Users } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import { MetricCard, PageSection } from "@/components/ui/enterprise";
import { useToast } from "@/components/ui/toast";

export default function BusinessCenterPage() {
  const { showToast } = useToast();

  return (
    <AppPage
      title="Workspace"
      eyebrow="Business center"
      description="Plan, billing, and org settings for Test Corp"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Test Corp
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Growth plan · AI CSV importer · Indian RE lead gen
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            showToast({
              title: "Billing portal",
              description: "Growth plan is active · next invoice on the 1st.",
              variant: "success",
            })
          }
          className="ge-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Manage billing
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Plan" value="Growth" tone="accent" hint="CSV AI importer included" />
        <MetricCard label="Seats" value="4 / 10" hint="Invite from Team Members" />
        <MetricCard label="AI imports (mo)" value="128" hint="Soft cap 2,000 rows / file" />
      </div>

      <PageSection title="Organization" description="Workspace identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ge-accent)] text-sm font-bold text-white">
                VK
              </div>
              <div>
                <p className="font-semibold text-[var(--ge-text)]">Test Corp</p>
                <p className="text-[12px] text-[var(--ge-text-muted)]">Owner · varun@groweasy.ai</p>
              </div>
            </div>
          </div>
          <div className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
              Region
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--ge-text)]">India · IST</p>
            <p className="mt-1 text-[12px] text-[var(--ge-text-secondary)]">
              Projects: Meridian, Sarjapur, Eden, Varah, LOD
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection title="Shortcuts" description="Jump to control-center tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/settings/team", title: "Team Members", body: "Invite agents & owners", icon: Users },
            { href: "/settings/crm-fields", title: "CRM Fields", body: "Schema & enums", icon: Building2 },
            { href: "/settings/api", title: "API Center", body: "Health & endpoints", icon: Building2 },
            { href: "/lead-sources", title: "Lead Sources", body: "CSV AI importer", icon: Building2 },
            { href: "/integrations/ads", title: "Ad Accounts", body: "FB / Google", icon: Building2 },
            { href: "/dashboard", title: "Dashboard", body: "Pipeline overview", icon: Building2 },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4 transition-colors hover:border-[var(--ge-border-strong)]"
            >
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">{item.title}</p>
              <p className="mt-1 text-[12.5px] text-[var(--ge-text-secondary)]">{item.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)]">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </PageSection>
    </AppPage>
  );
}
