"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { DEMO_LEADS } from "@/lib/demo/seed-data";
import {
  getImportHistory,
  getStoredLeads,
  type ImportHistoryEntry,
  type StoredLead,
} from "@/lib/store/import-history";
import { formatCrmStage } from "@/lib/validation/record-quality";

function useDashboardData() {
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedLeads = getStoredLeads();
    const storedHistory = getImportHistory();
    setLeads(storedLeads.length > 0 ? storedLeads : DEMO_LEADS);
    setHistory(storedHistory);
    setReady(true);
  }, []);

  const stats = useMemo(() => {
    if (!ready) return null;
    // Recompute from current state (demo or stored)
    const byStatus = {
      GOOD_LEAD_FOLLOW_UP: 0,
      DID_NOT_CONNECT: 0,
      BAD_LEAD: 0,
      SALE_DONE: 0,
      UNKNOWN: 0,
    };
    const bySource = {
      leads_on_demand: 0,
      meridian_tower: 0,
      eden_park: 0,
      varah_swamy: 0,
      sarjapur_plots: 0,
      UNKNOWN: 0,
    };
    for (const lead of leads) {
      if (lead.crm_status && lead.crm_status in byStatus) {
        byStatus[lead.crm_status as keyof typeof byStatus] += 1;
      } else byStatus.UNKNOWN += 1;
      if (lead.data_source && lead.data_source in bySource) {
        bySource[lead.data_source as keyof typeof bySource] += 1;
      } else bySource.UNKNOWN += 1;
    }
    return {
      totals: {
        leads: leads.length,
        clean: leads.filter((l) => l.qualityState === "clean").length,
        needsReview: leads.filter((l) => l.qualityState === "needs_review").length,
        imports: history.length,
      },
      byStatus,
      bySource,
      history,
      leads,
    };
  }, [leads, history, ready]);

  return { stats, ready, refresh: () => {
    setLeads(getStoredLeads().length > 0 ? getStoredLeads() : DEMO_LEADS);
    setHistory(getImportHistory());
  } };
}

export default function DashboardPage() {
  const { stats, ready, refresh } = useDashboardData();

  if (!ready || !stats) {
    return (
      <AppPage title="Overview" eyebrow="Dashboard" description="Loading workspace…">
        <div className="h-40 animate-pulse rounded-[var(--ge-radius-xl)] bg-[var(--ge-panel)]" />
      </AppPage>
    );
  }

  const statusRows = Object.entries(stats.byStatus)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => [
      k === "UNKNOWN" ? "Unset" : formatCrmStage(k),
      <span key={k} className="font-mono font-semibold tabular-nums">
        {n}
      </span>,
      <span key={`${k}-pct`} className="text-[var(--ge-text-muted)]">
        {Math.round((n / Math.max(stats.totals.leads, 1)) * 100)}%
      </span>,
    ]);

  const sourceRows = Object.entries(stats.bySource)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => [
      k === "UNKNOWN" ? "Unset / other" : k.replace(/_/g, " "),
      <span key={k} className="font-mono font-semibold tabular-nums">
        {n}
      </span>,
    ]);

  const recentLeads = stats.leads.slice(0, 6);
  const recentImports = stats.history.slice(0, 5);

  return (
    <AppPage
      title="Overview"
      eyebrow="Dashboard"
      description="Pipeline health across imports, CRM stages, and lead quality"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            Good morning, Jyothirmayudu Srungarapati
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            {stats.totals.imports > 0
              ? `${stats.totals.imports} CSV import${stats.totals.imports === 1 ? "" : "s"} in this browser · ${stats.totals.leads} leads in workspace`
              : "Showing demo leads until you import a CSV — data stays in this browser."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="ge-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Link
            href="/lead-sources"
            className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads in workspace" value={stats.totals.leads} hint="Manage Leads" />
        <MetricCard
          label="Clean"
          value={stats.totals.clean}
          tone="success"
          hint="Ready to sync"
        />
        <MetricCard
          label="Needs review"
          value={stats.totals.needsReview}
          tone="warning"
          hint="Fix before CRM sync"
        />
        <MetricCard
          label="CSV imports"
          value={stats.totals.imports}
          tone="accent"
          hint="This browser session store"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PageSection
          title="CRM stage mix"
          description="From leads currently in the workspace"
        >
          {statusRows.length === 0 ? (
            <p className="text-[13px] text-[var(--ge-text-muted)]">No stage data yet.</p>
          ) : (
            <EnterpriseTable headers={["Stage", "Count", "Share"]} rows={statusRows} />
          )}
        </PageSection>

        <PageSection title="Data source mix" description="GrowEasy project / source enums">
          {sourceRows.length === 0 ? (
            <p className="text-[13px] text-[var(--ge-text-muted)]">No source data yet.</p>
          ) : (
            <EnterpriseTable headers={["Source", "Leads"]} rows={sourceRows} />
          )}
        </PageSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PageSection
          title="Recent leads"
          description="Latest records in Manage Leads"
          action={
            <Link
              href="/leads"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <EnterpriseTable
            headers={["Name", "Status", "City", "Quality"]}
            rows={recentLeads.map((l) => [
              <div key={l.id}>
                <p className="font-semibold">{l.name || "—"}</p>
                <p className="font-mono text-[11px] text-[var(--ge-text-muted)]">{l.email || l.mobile_without_country_code || "—"}</p>
              </div>,
              l.crm_status ? formatCrmStage(l.crm_status) : "—",
              l.city || "—",
              <StatusPill
                key={`${l.id}-q`}
                label={l.qualityState === "clean" ? "Clean" : "Needs review"}
                tone={l.qualityState === "clean" ? "success" : "warning"}
              />,
            ])}
          />
        </PageSection>

        <PageSection
          title="Import history"
          description="CSV runs saved in this browser"
          action={
            <Link
              href="/lead-sources"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
            >
              Lead Sources <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {recentImports.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-[var(--ge-radius-md)] border border-dashed border-[var(--ge-border)] bg-[var(--ge-panel)] px-4 py-6">
              <FileSpreadsheet className="h-8 w-8 text-[var(--ge-success)]" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--ge-text)]">No imports yet</p>
                <p className="mt-1 text-[12.5px] text-[var(--ge-text-secondary)]">
                  Upload a CSV from Lead Sources — results appear here automatically.
                </p>
              </div>
              <Link href="/lead-sources" className="ge-btn-primary px-3 py-1.5 text-[12px]">
                Open Lead Sources
              </Link>
            </div>
          ) : (
            <EnterpriseTable
              headers={["File", "Imported", "Review", "When", ""]}
              rows={recentImports.map((h) => [
                <Link
                  key={h.id}
                  href={`/imports/${h.id}`}
                  className="font-medium text-[var(--ge-accent)] hover:underline"
                >
                  {h.fileName}
                </Link>,
                <span key={`${h.id}-i`} className="font-mono tabular-nums">
                  {h.totals.imported}
                </span>,
                <span key={`${h.id}-r`} className="font-mono tabular-nums text-[var(--ge-warning)]">
                  {h.quality.needsReview}
                </span>,
                new Date(h.importedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                <Link
                  key={`${h.id}-open`}
                  href={`/imports/${h.id}`}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
                >
                  View results <ArrowRight className="h-3.5 w-3.5" />
                </Link>,
              ])}
            />
          )}
        </PageSection>
      </div>
    </AppPage>
  );
}
