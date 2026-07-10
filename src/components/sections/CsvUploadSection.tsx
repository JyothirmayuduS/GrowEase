"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Info, Upload } from "lucide-react";

import { CloudStorageButtons } from "@/components/features/csv-import/CloudStorageButtons";
import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";
import { ImportPanel } from "@/components/layout/ImportPanel";
import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { cn } from "@/lib/utils";

interface CsvUploadSectionProps {
  onFileSelect?: (file: File) => void;
}

export function CsvUploadSection({ onFileSelect }: CsvUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file instanceof File) onFileSelect?.(file);
    },
    [onFileSelect]
  );

  return (
    <LeadSourcesPage
      title="Import via CSV"
      description="Upload a CSV file to bulk import leads into your system."
    >
      <ImportPanel>
        <div className="mx-auto flex w-full max-w-2xl flex-col">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200",
              isDragging
                ? "border-[var(--brand-blue)] bg-blue-50/50 ring-2 ring-[var(--brand-blue)]/15"
                : "border-[var(--ge-border)] bg-[var(--ge-surface)]/50 hover:border-[#d0d0d0] hover:bg-[var(--ge-surface)]"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                e.target.value = "";
                if (selected instanceof File) onFileSelect?.(selected);
              }}
            />

            <div
              className={cn(
                "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--ge-border)] bg-white transition-colors",
                isDragging && "border-[var(--brand-blue)]/30"
              )}
            >
              <Upload
                className={cn(
                  "h-5 w-5 transition-colors",
                  isDragging ? "text-[var(--brand-blue)]" : "text-[var(--ge-text-muted)] group-hover:text-[var(--ge-text)]"
                )}
              />
            </div>

            <p className="text-[15px] font-semibold text-[var(--ge-text)]">Drop your CSV file here</p>
            <p className="mt-1.5 text-[13px] text-[var(--ge-text-muted)]">
              or{" "}
              <span className="font-medium text-[var(--brand-blue)] group-hover:underline">
                click to browse files
              </span>
            </p>

            <div className="mx-auto mt-4 inline-flex items-center gap-1.5 text-[11px] text-[var(--ge-text-muted)]">
              <Info className="h-3 w-3 shrink-0" />
              .csv only · max 5MB
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[var(--ge-border)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--ge-border)] px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
                Any CSV shape
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open("/samples/whatsapp-agent-sheet.csv", "_blank");
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-[#2d6a4f] transition-colors hover:bg-[#e8f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f]/25"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Try messy sample
              </button>
            </div>
            <p className="px-4 py-3 text-[12px] leading-relaxed text-[var(--ge-text-muted)]">
              Headers do not need to match CRM fields. Facebook Lead Ads, Zoho exports,
              WhatsApp sheets, and typo-ridden agent lists are mapped by meaning after you
              confirm import. More samples under{" "}
              <span className="font-medium text-[var(--ge-text)]">/samples/</span>.
            </p>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--ge-text-muted)]">
              Or import from cloud
            </p>
            <CloudStorageButtons />
          </div>
        </div>
      </ImportPanel>
    </LeadSourcesPage>
  );
}
