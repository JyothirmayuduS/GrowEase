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
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e8e8e8] px-6 dark:border-slate-800">
        <AppLogo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center overflow-auto px-6 py-10">
        <div
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
          className={cn(
            "w-full max-w-[720px] rounded-sm border-2 px-10 py-14 text-center transition-colors sm:px-16 sm:py-16",
            isDragging
              ? "border-[var(--brand-blue)] bg-blue-50/40 dark:bg-blue-950/20"
              : "border-[var(--brand-blue)] bg-white dark:bg-slate-950"
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

          <CsvIllustration />

          <h1 className="text-[22px] font-normal tracking-tight text-[#2c2c2c] dark:text-slate-50">
            Import Leads via CSV
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#6e6e6e] dark:text-slate-400">
            Drag and drop a CSV file to import leads into your CRM with AI-powered field mapping.
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--brand-blue)] px-8 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-[var(--brand-blue-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2"
          >
            Select a file
          </button>

          <p className="mt-10 text-[13px] text-[#6e6e6e] dark:text-slate-400">
            Or from another storage account
          </p>
          <div className="mt-4 flex justify-center">
            <CloudStorageButtons variant="compact" />
          </div>
        </div>
      </main>
    </div>
  );
}
