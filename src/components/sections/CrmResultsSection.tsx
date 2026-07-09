"use client";

import { ArrowLeft, CheckCircle2, Download, XCircle } from "lucide-react";

import { CRM_FIELDS, CRM_FIELD_LABELS } from "@/lib/constants/crm";
import type { CrmLeadRecord, ImportApiResponse } from "@/lib/types/crm";
import { VirtualTable } from "@/components/ui/virtual-table";
import { Button } from "@/components/ui/button";

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

  const skippedHeaders = ["Row #", "Reason", "Raw Data"];
  const skippedRows = result.skipped.map((s) => ({
    "Row #": String(s.rowIndex + 1),
    Reason: s.reason,
    "Raw Data": JSON.stringify(s.raw),
  }));

  return (
    <section className="flex flex-1 flex-col bg-[#F5F8FC] px-6 py-6 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-[#6E6E6E] hover:text-[#2C2C2C] dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Import another
            </button>
            <div>
              <h2 className="text-lg font-bold text-[#2C2C2C] dark:text-slate-100">
                Import Results — {fileName}
              </h2>
              <p className="text-xs text-[#6E6E6E] dark:text-slate-400">
                AI-mapped GrowEasy CRM records
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() =>
              downloadCsv(recordsToCsv(result.imported), `groweasy-import-${Date.now()}.csv`)
            }
            className="h-9 gap-2 rounded-full bg-[#1473E6] px-5 text-sm font-semibold text-white hover:bg-[#0D66D0]"
          >
            <Download className="h-4 w-4" />
            Download CRM CSV
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Rows"
            value={result.totals.total}
            icon={<CheckCircle2 className="h-5 w-5 text-[#1473E6]" />}
          />
          <StatCard
            label="Imported"
            value={result.totals.imported}
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          />
          <StatCard
            label="Skipped"
            value={result.totals.skipped}
            icon={<XCircle className="h-5 w-5 text-amber-600" />}
          />
        </div>

        <div className="mb-6 rounded-lg border border-[#B3D4FF] bg-white dark:border-slate-700 dark:bg-slate-900">
          <h3 className="border-b border-[#E8E8E8] px-4 py-3 text-sm font-semibold text-[#2C2C2C] dark:border-slate-700 dark:text-slate-100">
            Successfully Parsed Records ({result.imported.length})
          </h3>
          <VirtualTable headers={crmHeaders} rows={crmRows} />
        </div>

        {result.skipped.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-white dark:border-amber-900 dark:bg-slate-900">
            <h3 className="border-b border-amber-100 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:text-amber-200">
              Skipped Records ({result.skipped.length})
            </h3>
            <VirtualTable headers={skippedHeaders} rows={skippedRows} maxHeight="min(40vh, 320px)" />
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#B3D4FF] bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      {icon}
      <div>
        <p className="text-xs text-[#6E6E6E] dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-[#2C2C2C] dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}
