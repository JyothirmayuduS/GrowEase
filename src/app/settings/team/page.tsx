import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_TEAM } from "@/lib/demo/seed-data";

export const metadata = {
  title: "Team Members — GrowEasy CRM",
};

export default function TeamMembersPage() {
  return (
    <AppPage
      title="Workspace team"
      eyebrow="Team Members"
      description="Roles and access for Test Corp"
    >
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

      <PageSection
        title="People"
        description="Owners can invite agents and assign lead ownership"
        action={
          <button type="button" className="ge-btn-primary px-3 py-1.5 text-[12px]">
            Invite member
          </button>
        }
      >
        <EnterpriseTable
          headers={["Name", "Email", "Role", "Status"]}
          rows={DEMO_TEAM.map((m) => [
            <span key={m.email} className="font-semibold">
              {m.name}
            </span>,
            <span key={`${m.email}-e`} className="font-mono text-[12px]">
              {m.email}
            </span>,
            m.role,
            <StatusPill
              key={`${m.email}-s`}
              label={m.status}
              tone={m.status === "Active" ? "success" : "warning"}
            />,
          ])}
        />
      </PageSection>
    </AppPage>
  );
}
