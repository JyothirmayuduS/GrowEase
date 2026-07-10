import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import { EnterpriseTable, PageSection, StatusPill } from "@/components/ui/enterprise";
import {
  CRM_FIELD_LABELS,
  CRM_FIELDS,
  CRM_STATUSES,
  DATA_SOURCES,
} from "@/lib/constants/crm";

export const metadata = {
  title: "CRM Fields",
};

export default function CrmFieldsPage() {
  return (
    <AppPage
      title="Schema"
      eyebrow="CRM Fields"
      description="Canonical GrowEasy lead fields used by AI mapping"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            CRM field catalog
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            {CRM_FIELDS.length} fields · CSV headers never need to match these keys.
          </p>
        </div>
        <Link
          href="/lead-sources"
          className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Test with CSV import
        </Link>
      </div>

      <PageSection
        title="Lead fields"
        description="Server sanitizes enums, dates, multi-contact → crm_note"
      >
        <EnterpriseTable
          headers={["Key", "Label", "Rules"]}
          rows={CRM_FIELDS.map((key) => [
            <code key={key} className="font-mono text-[12px] text-[var(--ge-accent)]">
              {key}
            </code>,
            CRM_FIELD_LABELS[key],
            key === "crm_status" || key === "data_source"
              ? "Enum — blank if invalid"
              : key === "crm_note"
                ? "Extras / multi-contact"
                : key === "possession_time"
                  ? "RE possession / handover"
                  : key === "created_at"
                    ? "JS Date-parseable or blank"
                    : "Free text / contact",
          ])}
        />
      </PageSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <PageSection title="crm_status" description="Exact values only">
          <div className="flex flex-wrap gap-2">
            {CRM_STATUSES.map((s) => (
              <StatusPill key={s} label={s} tone="accent" />
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[var(--ge-text-muted)]">
            Synonyms: hot / follow up → GOOD_LEAD_FOLLOW_UP · DNC → DID_NOT_CONNECT · booked →
            SALE_DONE
          </p>
        </PageSection>
        <PageSection title="data_source" description="Project / source enums">
          <div className="flex flex-wrap gap-2">
            {DATA_SOURCES.map((s) => (
              <StatusPill key={s} label={s} tone="muted" />
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[var(--ge-text-muted)]">
            Synonyms: LOD → leads_on_demand · Meridian → meridian_tower · Sarjapur → sarjapur_plots
          </p>
        </PageSection>
      </div>

      <Link
        href="/settings/api"
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
      >
        API Center — import endpoints <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </AppPage>
  );
}
