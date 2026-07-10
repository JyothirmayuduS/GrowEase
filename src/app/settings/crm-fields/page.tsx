import { AppPage } from "@/components/layout/AppPage";
import { EnterpriseTable, PageSection, StatusPill } from "@/components/ui/enterprise";
import {
  CRM_FIELD_LABELS,
  CRM_FIELDS,
  CRM_STATUSES,
  DATA_SOURCES,
} from "@/lib/constants/crm";

export const metadata = {
  title: "CRM Fields — GrowEasy CRM",
};

export default function CrmFieldsPage() {
  return (
    <AppPage
      title="Schema"
      eyebrow="CRM Fields"
      description="Canonical GrowEasy lead fields used by AI mapping"
    >
      <PageSection
        title="Lead fields"
        description={`${CRM_FIELDS.length} fields — CSV headers map into these keys`}
      >
        <EnterpriseTable
          headers={["Key", "Label", "Notes"]}
          rows={CRM_FIELDS.map((key) => [
            <code key={key} className="font-mono text-[12px] text-[var(--ge-accent)]">
              {key}
            </code>,
            CRM_FIELD_LABELS[key],
            key === "crm_status" || key === "data_source"
              ? "Enum — validated server-side"
              : key === "crm_note"
                ? "Extras / multi-contact"
                : key === "possession_time"
                  ? "RE domain"
                  : "Free text / contact",
          ])}
        />
      </PageSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <PageSection title="crm_status values" description="Exact enums only">
          <div className="flex flex-wrap gap-2">
            {CRM_STATUSES.map((s) => (
              <StatusPill key={s} label={s} tone="accent" />
            ))}
          </div>
        </PageSection>
        <PageSection title="data_source values" description="Project / source enums">
          <div className="flex flex-wrap gap-2">
            {DATA_SOURCES.map((s) => (
              <StatusPill key={s} label={s} tone="muted" />
            ))}
          </div>
        </PageSection>
      </div>
    </AppPage>
  );
}
