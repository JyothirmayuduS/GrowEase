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
    <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] p-4 dark:bg-slate-950 sm:p-8">
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
          "relative flex h-full w-full max-w-[1200px] flex-col items-center justify-center rounded-xl bg-white px-6 py-12 text-center transition-all duration-200 dark:bg-slate-900",
          isDragging
            ? "border-2 border-dashed border-[#1473e6] bg-[#f0f7ff] dark:bg-blue-950/20"
            : "border border-slate-200 shadow-sm dark:border-slate-800"
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

        <div className="flex w-full max-w-[500px] flex-col items-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center">
            <CsvIllustration />
          </div>

          <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] dark:text-white sm:text-[40px]">
            Import Leads via CSV
          </h1>

          <p className="mt-4 text-[16px] text-[#5e5e5e] dark:text-slate-400">
            Drag and drop a CSV file to use our AI converter.
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#1473e6] px-10 text-[16px] font-semibold text-white transition-colors hover:bg-[#0d66d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"
          >
            Select a file
          </button>

          <div className="mt-12 flex flex-col items-center space-y-4">
            <p className="text-[14px] font-medium text-[#5e5e5e] dark:text-slate-400">
              Or from another storage account
            </p>
            <CloudStorageButtons variant="compact" onFileSelect={onFileSelect} />
          </div>

          <div className="mt-12">
            <p className="text-[13px] text-[#8e8e8e] dark:text-slate-500">
              Try a messy sample:{" "}
              <a
                href="/samples/whatsapp-agent-sheet.csv"
                className="font-medium hover:text-[#1473e6] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                WhatsApp sheet
              </a>
              {" · "}
              <a
                href="/samples/zoho-crm-export.csv"
                className="font-medium hover:text-[#1473e6] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Zoho export
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
