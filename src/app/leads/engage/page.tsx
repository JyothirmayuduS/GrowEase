import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_ENGAGE_QUEUE } from "@/lib/demo/seed-data";

export const metadata = {
  title: "Engage Leads — GrowEasy CRM",
};

export default function EngageLeadsPage() {
  return (
    <AppPage
      title="Outreach queue"
      eyebrow="Engage Leads"
      description="WhatsApp, calls, and follow-ups for hot leads"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Due today" value={2} tone="warning" />
        <MetricCard label="WhatsApp pending" value={2} tone="accent" />
        <MetricCard label="Calls scheduled" value={1} />
      </div>

      <PageSection
        title="Today’s queue"
        description="Prioritized by CRM stage and last touch"
      >
        <EnterpriseTable
          headers={["Lead", "Channel", "Next action", "Due", "Owner", "State"]}
          rows={DEMO_ENGAGE_QUEUE.map((item) => [
            <span key={item.name} className="font-semibold">
              {item.name}
            </span>,
            item.channel,
            item.nextAction,
            item.due,
            item.owner,
            <StatusPill key={`${item.name}-s`} label="Queued" tone="accent" />,
          ])}
        />
      </PageSection>

      <PageSection title="Playbooks" description="Reusable engagement sequences">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              name: "Site visit nurture",
              steps: "WA brochure → Call → Visit confirm",
              status: "Active",
            },
            {
              name: "Did not connect retry",
              steps: "Call ×3 → WA ping → Mark DNC",
              status: "Active",
            },
            {
              name: "Post-token onboarding",
              steps: "Docs WA → Possession FAQ → Handover",
              status: "Draft",
            },
            {
              name: "LOD warm leads",
              steps: "Same-day call → Project pitch",
              status: "Active",
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
            </div>
          ))}
        </div>
      </PageSection>
    </AppPage>
  );
}
