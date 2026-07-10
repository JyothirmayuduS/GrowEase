"use client";

import { useCallback, useRef, useState } from "react";

import { CloudStorageButtons } from "@/components/features/csv-import/CloudStorageButtons";
import { CsvIllustration } from "@/components/features/csv-import/CsvIllustration";
import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";
import { AppLogo } from "@/components/icons/AppLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

interface LandingUploadSectionProps {
  onFileSelect?: (file: File) => void;
}

/**
 * Adobe Acrobat "Convert to PDF" layout clone —
 * full-bleed white drop zone, grey dotted border (per product request).
 */
export function LandingUploadSection({ onFileSelect }: LandingUploadSectionProps) {
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
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      {/* Adobe-style top bar */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#eaeaea] bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
        <AppLogo />
        <ThemeToggle />
      </header>

      {/* Full-bleed drop zone — same proportions as Acrobat Convert */}
      <main className="flex min-h-0 flex-1 flex-col bg-white p-3 dark:bg-slate-950 sm:p-4">
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
            "ge-dropzone flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center",
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

          <div className="flex w-full max-w-[560px] flex-col items-center">
            <CsvIllustration />

            <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#2c2c2c] dark:text-slate-50">
              Import Leads via CSV
            </h1>

            <p className="mt-3 max-w-[420px] text-[16px] leading-[1.45] text-[#505050] dark:text-slate-400">
              Drag and drop a CSV file to import leads into your CRM with AI-powered field mapping.
              Max 5 MB · .csv only.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#1473e6] px-8 text-[16px] font-medium text-white transition-colors hover:bg-[#0d66d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473e6] focus-visible:ring-offset-2"
            >
              Select a file
            </button>

            <p className="mt-9 text-[14px] text-[#6e6e6e] dark:text-slate-400">
              Or from another storage account
            </p>

            <div className="mt-4">
              <CloudStorageButtons variant="compact" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
