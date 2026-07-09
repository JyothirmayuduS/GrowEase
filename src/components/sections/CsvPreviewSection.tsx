"use client";

import { ArrowLeft, FileSpreadsheet, Loader2 } from "lucide-react";

import { VirtualTable } from "@/components/ui/virtual-table";
import { Button } from "@/components/ui/button";
import type { ParsedCsv } from "@/lib/types/app";

interface CsvPreviewSectionProps {
  data: ParsedCsv;
  onConfirm: () => void;
  onBack: () => void;
  isParsing?: boolean;
}

export function CsvPreviewSection({
  data,
  onConfirm,
  onBack,
  isParsing = false,
}: CsvPreviewSectionProps) {
  const { headers, rows } = data;

  return (
    <section className="flex flex-1 flex-col bg-[#F5F8FC] px-6 py-6 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-[#6E6E6E] transition-colors hover:text-[#2C2C2C] dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#1473E6]" />
              <div>
                <h2 className="text-lg font-bold text-[#2C2C2C] dark:text-slate-100">
                  {data.fileName}
                </h2>
                <p className="text-xs text-[#6E6E6E] dark:text-slate-400">
                  {rows.length} rows · {(data.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            disabled={isParsing || headers.length === 0}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="h-9 rounded-full bg-[#1473E6] px-6 text-sm font-semibold text-white hover:bg-[#0D66D0] disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing…
              </>
            ) : (
              "Confirm Import"
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border border-[#B3D4FF] bg-white dark:border-slate-700 dark:bg-slate-900">
          {headers.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6E6E6E] dark:text-slate-400">
              No columns found in this CSV file.
            </p>
          ) : (
            <VirtualTable headers={headers} rows={rows} maxHeight="min(65vh, 560px)" />
          )}
        </div>

        <p className="mt-3 text-center text-xs text-[#6E6E6E] dark:text-slate-400">
          Review your data above. AI mapping begins only after you confirm.
        </p>
      </div>
    </section>
  );
}
