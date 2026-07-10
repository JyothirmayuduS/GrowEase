"use client";

import { useCallback, useRef, useState } from "react";

import { CloudStorageButtons } from "@/components/features/csv-import/CloudStorageButtons";
import { CsvIllustration } from "@/components/features/csv-import/CsvIllustration";
import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";
import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { PageSection } from "@/components/ui/enterprise";
import { cn } from "@/lib/utils";

interface CsvUploadSectionProps {
  onFileSelect?: (file: File) => void;
}

/**
 * Same upload content as the start screen, fitted inside Lead Sources
 * (sidebar + page header + card) — not full-screen.
 */
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
      description="Upload a CSV to bulk import leads into GrowEasy."
    >
      <div className="ge-scroll-quiet flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6 sm:py-5">
        <PageSection
          title="Upload CSV"
          description="Any CSV shape works — Facebook Lead Ads, Zoho, WhatsApp sheets, typo headers"
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "ge-dropzone flex flex-col items-center justify-center rounded-[var(--ge-radius-lg)] px-6 py-10 text-center sm:py-14",
              isDragging && "is-active"
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

            <div className="flex w-full max-w-[520px] flex-col items-center">
              <CsvIllustration />

              <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#2c2c2c] dark:text-slate-50 sm:text-[28px]">
                Import Leads via CSV
              </h1>

              <p className="mt-3 max-w-[420px] text-[15px] leading-[1.45] text-[#505050] dark:text-slate-400 sm:text-[16px]">
                Preview first, then confirm AI mapping. Max 5 MB · .csv only.
              </p>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#1473e6] px-8 text-[16px] font-medium text-white transition-colors hover:bg-[#0d66d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"
              >
                Select a file
              </button>

              <p className="mt-5 text-[13px] text-[#6e6e6e] dark:text-slate-400">
                Try a messy sample:{" "}
                <a
                  href="/samples/whatsapp-agent-sheet.csv"
                  className="font-medium text-[#1473e6] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  WhatsApp sheet
                </a>
                {" · "}
                <a
                  href="/samples/zoho-crm-export.csv"
                  className="font-medium text-[#1473e6] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Zoho export
                </a>
                {" · "}
                <a
                  href="/samples/typo-headers.csv"
                  className="font-medium text-[#1473e6] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  typo headers
                </a>
              </p>

              <p className="mt-8 text-[14px] text-[#6e6e6e] dark:text-slate-400">
                Or from another storage account
              </p>

              <div className="mt-4">
                <CloudStorageButtons variant="compact" onFileSelect={onFileSelect} />
              </div>
            </div>
          </div>
        </PageSection>
      </div>
    </LeadSourcesPage>
  );
}
