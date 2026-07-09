"use client";

import { useRef } from "react";
import { FileSpreadsheet, X } from "lucide-react";

import { ImportPanel } from "@/components/layout/ImportPanel";
import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { VirtualTable } from "@/components/ui/virtual-table";
import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";
import type { ParsedCsv } from "@/lib/types/app";

interface CsvPreviewSectionProps {
  data: ParsedCsv;
  onConfirm: () => void;
  onBack: () => void;
  onReplaceFile?: (file: File) => void;
}

export function CsvPreviewSection({
  data,
  onConfirm,
  onBack,
  onReplaceFile,
}: CsvPreviewSectionProps) {
  const { headers, rows } = data;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <LeadSourcesPage
      title="Preview import"
      description={`${rows.length} rows in ${data.fileName} — review before uploading.`}
    >
      <ImportPanel
        footer={
          <>
            <button type="button" onClick={onBack} className="ge-btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={headers.length === 0 || rows.length === 0}
              onClick={onConfirm}
              className="ge-btn-primary"
            >
              Confirm Import
            </button>
          </>
        }
      >
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-[var(--ge-border)] bg-[var(--ge-surface)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e8f5ef]">
                <FileSpreadsheet className="h-4 w-4 text-[#2d6a4f]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ge-text)]">{data.fileName}</p>
                <p className="text-[12px] text-[var(--ge-text-muted)]">
                  {(data.fileSize / 1024).toFixed(2)} KB · {rows.length} rows
                </p>
              </div>
            </div>
            {onReplaceFile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    e.target.value = "";
                    if (selected instanceof File) onReplaceFile(selected);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Replace file"
                  className="shrink-0 rounded-lg p-1.5 text-[var(--ge-text-muted)] hover:bg-white hover:text-[var(--ge-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--ge-border)]">
            {headers.length === 0 ? (
              <p className="p-12 text-center text-sm text-[var(--ge-text-muted)]">
                No columns found in this CSV file.
              </p>
            ) : (
              <VirtualTable
                headers={headers}
                rows={rows}
                maxHeight="calc(100vh - 320px)"
                variant="groweasy"
              />
            )}
          </div>
        </div>
      </ImportPanel>
    </LeadSourcesPage>
  );
}
