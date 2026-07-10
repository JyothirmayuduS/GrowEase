import Link from "next/link";
import { ArrowRight, UserPlus, Shield, Mail } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_TEAM } from "@/lib/demo/seed-data";

export const metadata = {
  title: "Team Members",
};

export default function TeamMembersPage() {
  return (
    <AppPage
      title="Workspace team"
      eyebrow="Team Members"
      description="Roles, invites, and lead ownership for Test Corp"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            People
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Owners manage seats; agents own leads in Manage & Engage.
          </p>
        </div>
        <button type="button" className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]">
          <UserPlus className="h-3.5 w-3.5" />
          Invite member
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Members" value={DEMO_TEAM.length} />
        <MetricCard
          label="Active"
          value={DEMO_TEAM.filter((t) => t.status === "Active").length}
          tone="success"
        />
        <MetricCard
          label="Invited"
          value={DEMO_TEAM.filter((t) => t.status === "Invited").length}
          tone="warning"
        />
      </div>

      <PageSection title="Directory" description="Email is used as lead_owner on imports">
        <EnterpriseTable
          headers={["Name", "Email", "Role", "Status", ""]}
          rows={DEMO_TEAM.map((m) => [
            <div key={m.email} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ge-accent-tint)] text-[11px] font-bold text-[var(--ge-accent)]">
                {m.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="font-semibold">{m.name}</span>
            </div>,
            <span key={`${m.email}-e`} className="inline-flex items-center gap-1.5 font-mono text-[12px]">
              <Mail className="h-3 w-3 text-[var(--ge-text-muted)]" />
              {m.email}
            </span>,
            <span key={`${m.email}-r`} className="inline-flex items-center gap-1">
              {m.role === "Owner" ? <Shield className="h-3 w-3 text-[var(--ge-accent)]" /> : null}
              {m.role}
            </span>,
            <StatusPill
              key={`${m.email}-s`}
              label={m.status}
              tone={m.status === "Active" ? "success" : "warning"}
            />,
            <Link
              key={`${m.email}-l`}
              href="/leads"
              className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
            >
              View leads
            </Link>,
          ])}
        />
      </PageSection>

      <PageSection title="Roles" description="Access model for GrowEasy CRM">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              role: "Owner",
              perms: "Billing, invites, API keys, all leads",
            },
            {
              role: "Sales lead",
              perms: "Assign owners, campaigns, export CSV",
            },
            {
              role: "Agent",
              perms: "Own leads, Engage queue, import CSV",
            },
          ].map((r) => (
            <div
              key={r.role}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4"
            >
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">{r.role}</p>
              <p className="mt-1.5 text-[12.5px] text-[var(--ge-text-secondary)]">{r.perms}</p>
            </div>
          ))}
        </div>
        <Link
          href="/business"
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
        >
          Business center & seats <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PageSection>
    </AppPage>
  );
}
