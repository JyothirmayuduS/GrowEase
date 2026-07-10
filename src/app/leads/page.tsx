"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, Upload } from "lucide-react";

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
          l.city.toLowerCase().includes(query) ||
          l.company.toLowerCase().includes(query)
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Lead directory
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Search, filter by quality, and open Engage for follow-ups.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/leads/engage"
            className="ge-btn-secondary px-3 py-2 text-[12px]"
          >
            Engage queue
          </Link>
          <Link
            href="/lead-sources"
            className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Link>
        </div>
      </div>

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

      <PageSection title="Leads" description={`${visible.length} showing`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ge-text-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone, city…"
              className="w-full rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] py-2 pr-3 pl-9 text-[13px] outline-none focus:border-[var(--ge-accent)]"
            />
          </div>
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
            No leads match this filter.{" "}
            <Link href="/lead-sources" className="font-semibold text-[var(--ge-accent)] hover:underline">
              Import a CSV
            </Link>
          </p>
        ) : (
          <EnterpriseTable
            headers={["Name", "Contact", "City", "Stage", "Source", "Quality", "Owner"]}
            rows={visible.map((l) => [
              <div key={`${l.id}-n`}>
                <p className="font-semibold">{l.name || "—"}</p>
                {l.sourceFile ? (
                  <p className="text-[10px] text-[var(--ge-text-muted)]">{l.sourceFile}</p>
                ) : null}
              </div>,
              <div key={`${l.id}-c`} className="font-mono text-[12px]">
                <div>{l.email || "—"}</div>
                <div className="text-[var(--ge-text-muted)]">
                  {[l.country_code, l.mobile_without_country_code].filter(Boolean).join(" ") || "—"}
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

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
      >
        Back to Dashboard <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </AppPage>
  );
}
