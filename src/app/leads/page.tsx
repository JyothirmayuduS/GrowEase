"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_LEADS } from "@/lib/demo/seed-data";
import { getStoredLeads, type StoredLead } from "@/lib/store/import-history";
import { formatCrmStage } from "@/lib/validation/record-quality";

type Filter = "all" | "clean" | "needs_review";

export default function ManageLeadsPage() {
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const stored = getStoredLeads();
    setLeads(stored.length > 0 ? stored : DEMO_LEADS);
  }, []);

  const visible = useMemo(() => {
    let list = leads;
    if (filter !== "all") list = list.filter((l) => l.qualityState === filter);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          l.mobile_without_country_code.includes(query) ||
          l.city.toLowerCase().includes(query)
      );
    }
    return list;
  }, [leads, filter, q]);

  return (
    <AppPage
      title="All leads"
      eyebrow="Manage Leads"
      description="CRM-mapped leads from CSV imports and campaigns"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total" value={leads.length} />
        <MetricCard
          label="Clean"
          value={leads.filter((l) => l.qualityState === "clean").length}
          tone="success"
        />
        <MetricCard
          label="Needs review"
          value={leads.filter((l) => l.qualityState === "needs_review").length}
          tone="warning"
        />
      </div>

      <PageSection
        title="Lead directory"
        description="Search and filter workspace leads"
        action={
          <Link href="/lead-sources" className="ge-btn-primary px-3 py-1.5 text-[12px]">
            Import CSV
          </Link>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, city…"
            className="w-full flex-1 rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ge-accent)] sm:max-w-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["clean", "Clean"],
                ["needs_review", "Needs review"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  filter === key
                    ? "border-[var(--ge-border-strong)] bg-[var(--ge-panel)] text-[var(--ge-text)]"
                    : "border-[var(--ge-border)] text-[var(--ge-text-secondary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[var(--ge-text-muted)]">
            No leads match this filter.
          </p>
        ) : (
          <EnterpriseTable
            headers={["Name", "Contact", "City", "Stage", "Source", "Quality", "Owner"]}
            rows={visible.map((l) => [
              <span key={`${l.id}-n`} className="font-semibold">
                {l.name || "—"}
              </span>,
              <div key={`${l.id}-c`} className="font-mono text-[12px]">
                <div>{l.email || "—"}</div>
                <div className="text-[var(--ge-text-muted)]">
                  {l.country_code} {l.mobile_without_country_code}
                </div>
              </div>,
              l.city || "—",
              l.crm_status ? formatCrmStage(l.crm_status) : "—",
              l.data_source ? l.data_source.replace(/_/g, " ") : "—",
              <StatusPill
                key={`${l.id}-q`}
                label={l.qualityState === "clean" ? "Clean" : "Needs review"}
                tone={l.qualityState === "clean" ? "success" : "warning"}
              />,
              <span key={`${l.id}-o`} className="text-[12px] text-[var(--ge-text-secondary)]">
                {l.lead_owner || "—"}
              </span>,
            ])}
          />
        )}
      </PageSection>
    </AppPage>
  );
}
