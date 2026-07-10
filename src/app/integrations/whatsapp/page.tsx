import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";

export const metadata = { title: "WhatsApp Account" };

export default function WhatsAppPage() {
  return (
    <AppPage
      title="Messaging"
      eyebrow="WhatsApp Account"
      description="Business WhatsApp for Engage Leads and agent sheets"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            WhatsApp Business
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Templates, quality rating, and inbox for RE follow-ups.
          </p>
        </div>
        <Link
          href="/leads/engage"
          className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Open Engage queue
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Numbers" value={1} />
        <MetricCard label="Unread" value={7} tone="warning" />
        <MetricCard label="Templates" value={12} tone="accent" />
      </div>

      <PageSection title="Connected number" description="Meta Business API">
        <EnterpriseTable
          headers={["Display name", "Number", "Quality", "Status"]}
          rows={[
            [
              "GrowEasy Sales",
              "+91 80XXXXXX21",
              "High",
              <StatusPill key="w" label="Live" tone="success" />,
            ],
          ]}
        />
      </PageSection>

      <PageSection title="Approved templates" description="Used by Engage playbooks">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { id: "site_visit_confirm", use: "Visit confirmations" },
            { id: "brochure_followup", use: "Post-brochure nudge" },
            { id: "callback_reminder", use: "Evening callbacks" },
            { id: "token_thanks", use: "Post-token thank you" },
          ].map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2.5"
            >
              <div>
                <code className="font-mono text-[12px] text-[var(--ge-text)]">{t.id}</code>
                <p className="text-[11px] text-[var(--ge-text-muted)]">{t.use}</p>
              </div>
              <StatusPill label="Approved" tone="success" />
            </div>
          ))}
        </div>
      </PageSection>

      <p className="text-[13px] text-[var(--ge-text-secondary)]">
        Have a WA-shared contact list?{" "}
        <Link href="/lead-sources" className="inline-flex items-center gap-1 font-semibold text-[var(--ge-accent)] hover:underline">
          Import the sheet <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </AppPage>
  );
}
