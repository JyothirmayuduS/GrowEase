import Link from "next/link";
import { ArrowRight, Phone, MessageCircle, Clock, CheckCircle2 } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_ENGAGE_QUEUE } from "@/lib/demo/seed-data";

export const metadata = {
  title: "Engage Leads",
};

export default function EngageLeadsPage() {
  return (
    <AppPage
      title="Outreach queue"
      eyebrow="Engage Leads"
      description="WhatsApp, calls, and follow-ups prioritized by CRM stage"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Engage today
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Work the queue — callbacks, site visits, and WA follow-ups for hot leads.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/integrations/whatsapp"
            className="ge-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Link>
          <Link
            href="/integrations/tele-calling"
            className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            <Phone className="h-3.5 w-3.5" />
            Open dialer
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Due today" value={2} tone="warning" hint="Callbacks + visits" />
        <MetricCard label="WhatsApp pending" value={2} tone="accent" />
        <MetricCard label="Calls scheduled" value={1} />
        <MetricCard label="Completed today" value={5} tone="success" />
      </div>

      <PageSection
        title="Today’s queue"
        description="Sorted by urgency and last touch"
        action={
          <Link
            href="/leads"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
          >
            All leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <EnterpriseTable
          headers={["Lead", "Channel", "Next action", "Due", "Owner", "State"]}
          rows={DEMO_ENGAGE_QUEUE.map((item) => [
            <span key={item.name} className="font-semibold">
              {item.name}
            </span>,
            <span key={`${item.name}-ch`} className="inline-flex items-center gap-1.5">
              {item.channel === "Call" ? (
                <Phone className="h-3.5 w-3.5 text-[var(--ge-text-muted)]" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5 text-[var(--ge-success)]" />
              )}
              {item.channel}
            </span>,
            item.nextAction,
            <span key={`${item.name}-d`} className="inline-flex items-center gap-1 text-[12px]">
              <Clock className="h-3 w-3 text-[var(--ge-warning)]" />
              {item.due}
            </span>,
            item.owner,
            <StatusPill key={`${item.name}-s`} label="Queued" tone="accent" />,
          ])}
        />
      </PageSection>

      <PageSection title="Playbooks" description="Reusable sequences for RE sales">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              name: "Site visit nurture",
              steps: "WA brochure → Call → Visit confirm",
              status: "Active",
              uses: 34,
            },
            {
              name: "Did not connect retry",
              steps: "Call ×3 → WA ping → Mark DNC",
              status: "Active",
              uses: 58,
            },
            {
              name: "Post-token onboarding",
              steps: "Docs WA → Possession FAQ → Handover",
              status: "Draft",
              uses: 0,
            },
            {
              name: "LOD warm leads",
              steps: "Same-day call → Project pitch",
              status: "Active",
              uses: 21,
            },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-[var(--ge-text)]">{p.name}</p>
                <StatusPill
                  label={p.status}
                  tone={p.status === "Active" ? "success" : "muted"}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] text-[var(--ge-text-secondary)]">{p.steps}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-[var(--ge-text-muted)]">
                <CheckCircle2 className="h-3 w-3" />
                Used {p.uses} times this month
              </p>
            </div>
          ))}
        </div>
      </PageSection>
    </AppPage>
  );
}
