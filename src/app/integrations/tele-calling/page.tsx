"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, Headphones } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { useToast } from "@/components/ui/toast";

const QUEUES = [
  { id: "dnc", name: "Did not connect — retry", leads: "24", priority: "High", tone: "success" as const },
  { id: "follow", name: "Good lead follow-up", leads: "18", priority: "Medium", tone: "success" as const },
  { id: "fresh", name: "Fresh CSV imports", leads: "9", priority: "High", tone: "accent" as const },
];

export default function TeleCallingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const dial = (queueName: string) => {
    showToast({
      title: "Dialer session started",
      description: `Opening Engage with queue: ${queueName}`,
      variant: "success",
    });
    router.push("/leads/engage");
  };

  return (
    <AppPage
      title="Dialer"
      eyebrow="Tele Calling"
      description="Outbound calling for DID_NOT_CONNECT and follow-ups"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Call center
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Queues auto-build from CRM stage after CSV import.
          </p>
        </div>
        <Link
          href="/leads/engage"
          className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
        >
          <Headphones className="h-3.5 w-3.5" />
          Start session
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Agents online" value={2} tone="success" />
        <MetricCard label="Calls today" value={47} />
        <MetricCard label="Connect rate" value="38%" tone="accent" />
      </div>

      <PageSection title="Queues" description="Auto-built from CRM stage + import flags">
        <EnterpriseTable
          headers={["Queue", "Leads", "Priority", "Status", ""]}
          rows={QUEUES.map((q) => [
            q.name,
            q.leads,
            q.priority,
            <StatusPill key={`${q.id}-s`} label="Active" tone={q.tone} />,
            <button
              key={`${q.id}-d`}
              type="button"
              onClick={() => dial(q.name)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
            >
              <Phone className="h-3 w-3" /> Dial
            </button>,
          ])}
        />
      </PageSection>

      <p className="text-[13px] text-[var(--ge-text-secondary)]">
        New imports land here after mapping.{" "}
        <Link
          href="/lead-sources"
          className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)] hover:underline"
        >
          Import CSV <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </AppPage>
  );
}
