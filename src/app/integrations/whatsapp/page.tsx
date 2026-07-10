import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";

export const metadata = { title: "WhatsApp Account — GrowEasy CRM" };

export default function WhatsAppPage() {
  return (
    <AppPage
      title="Messaging"
      eyebrow="WhatsApp Account"
      description="Business WhatsApp for Engage Leads"
    >
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

      <PageSection title="Templates" description="Approved message templates">
        <div className="grid gap-2 sm:grid-cols-2">
          {["site_visit_confirm", "brochure_followup", "callback_reminder", "token_thanks"].map(
            (t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2.5"
              >
                <code className="font-mono text-[12px] text-[var(--ge-text)]">{t}</code>
                <StatusPill label="Approved" tone="success" />
              </div>
            )
          )}
        </div>
      </PageSection>
    </AppPage>
  );
}
