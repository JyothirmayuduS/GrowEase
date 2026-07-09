"use client";

import { Download } from "lucide-react";

import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { CRM_FIELDS, CRM_FIELD_LABELS } from "@/lib/constants/crm";
import type { CrmLeadRecord, ImportApiResponse } from "@/lib/types/crm";
import { VirtualTable } from "@/components/ui/virtual-table";

interface CrmResultsSectionProps {
  fileName: string;
  result: ImportApiResponse;
  onBack: () => void;
}

function recordsToCsv(records: CrmLeadRecord[]): string {
  const header = CRM_FIELDS.join(",");
  const lines = records.map((record) =>
    CRM_FIELDS.map((field) => {
      const value = record[field] ?? "";
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CrmResultsSection({ fileName, result, onBack }: CrmResultsSectionProps) {
  const crmHeaders = CRM_FIELDS.map((f) => CRM_FIELD_LABELS[f]);
  const crmRows = result.imported.map((record) => {
    const row: Record<string, string> = {};
    CRM_FIELDS.forEach((field, i) => {
      row[crmHeaders[i]] = record[field] ?? "";
    });
    return row;
  });

  const skippedHeaders = ["ROW #", "REASON", "RAW DATA"];
  const skippedRows = result.skipped.map((s) => ({
    "ROW #": String(s.rowIndex + 1),
    REASON: s.reason,
    "RAW DATA": JSON.stringify(s.raw),
  }));

  return (
    <LeadSourcesPage
      title="Import results"
      description={`${result.totals.imported} of ${result.totals.total} leads imported from ${fileName}.`}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--ge-border)] px-6 py-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-3">
            <MetricPill label="Total" value={result.totals.total} />
            <MetricPill label="Imported" value={result.totals.imported} tone="green" />
            <MetricPill label="Skipped" value={result.totals.skipped} tone="amber" />
            <MetricPill label="Source" value={fileName} isText />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack} className="ge-btn-secondary">
              Import another
            </button>
            <button
              type="button"
              onClick={() =>
                downloadCsv(recordsToCsv(result.imported), `groweasy-import-${Date.now()}.csv`)
              }
              className="ge-btn-primary inline-flex items-center"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--ge-border)]">
            <VirtualTable
              headers={crmHeaders}
              rows={crmRows}
              maxHeight="calc(100vh - 300px)"
              variant="groweasy"
            />
          </div>

          {result.skipped.length > 0 && (
            <div className="mt-5 shrink-0 overflow-hidden rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Skipped records ({result.skipped.length})
              </p>
              <VirtualTable
                headers={skippedHeaders}
                rows={skippedRows}
                maxHeight="min(28vh, 220px)"
                variant="groweasy"
              />
            </div>
          )}
        </div>
      </div>
    </LeadSourcesPage>
  );
}

function MetricPill({
  label,
  value,
  tone,
  isText,
}: {
  label: string;
  value: number | string;
  tone?: "green" | "amber";
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--ge-border)] bg-[var(--ge-surface)] px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ge-text-muted)]">
        {label}
      </p>
      <p
        className={`mt-0.5 font-semibold ${
          isText
            ? "max-w-[220px] truncate text-sm text-[var(--ge-text)]"
            : `text-lg tabular-nums ${
                tone === "green"
                  ? "text-green-600"
                  : tone === "amber"
                    ? "text-amber-600"
                    : "text-[var(--ge-text)]"
              }`
        }`}
      >
        {value}
      </p>
    </div>
  );
}
