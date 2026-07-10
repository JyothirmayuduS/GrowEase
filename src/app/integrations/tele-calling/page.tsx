import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";

export const metadata = { title: "Tele Calling — GrowEasy CRM" };

export default function TeleCallingPage() {
  return (
    <AppPage
      title="Dialer"
      eyebrow="Tele Calling"
      description="Outbound calling for DID_NOT_CONNECT and follow-ups"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Agents online" value={2} tone="success" />
        <MetricCard label="Calls today" value={47} />
        <MetricCard label="Connect rate" value="38%" tone="accent" />
      </div>

      <PageSection title="Queues" description="Auto-built from CRM stage">
        <EnterpriseTable
          headers={["Queue", "Leads", "Priority", "Status"]}
          rows={[
            [
              "Did not connect — retry",
              "24",
              "High",
              <StatusPill key="1" label="Active" tone="success" />,
            ],
            [
              "Good lead follow-up",
              "18",
              "Medium",
              <StatusPill key="2" label="Active" tone="success" />,
            ],
            [
              "Fresh CSV imports",
              "9",
              "High",
              <StatusPill key="3" label="Active" tone="accent" />,
            ],
          ]}
        />
      </PageSection>
    </AppPage>
  );
}
