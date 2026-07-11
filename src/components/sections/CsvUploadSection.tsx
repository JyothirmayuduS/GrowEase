"use client";

import { useCallback, useRef, useState } from "react";


import { CsvIllustration } from "@/components/features/csv-import/CsvIllustration";
import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";
import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { PageSection } from "@/components/ui/enterprise";
import { cn } from "@/lib/utils";

import Link from "next/link";
import { AppLogo } from "@/components/icons/AppLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface CsvUploadSectionProps {
  onFileSelect?: (file: File) => void;
  isFirstVisit?: boolean;
}

/**
 * Conditionally renders full-screen Adobe style (first visit) or
 * fitted inside Lead Sources (sidebar + page header + card).
 */
export function CsvUploadSection({ onFileSelect, isFirstVisit = true }: CsvUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file instanceof File) onFileSelect?.(file);
    },
    [onFileSelect]
  );

  if (!isFirstVisit) {
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
              </div>
            </div>
          </PageSection>
        </div>
      </LeadSourcesPage>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8f9fa] dark:bg-slate-950">
      <header className="flex h-16 shrink-0 items-center justify-between bg-[#141414] px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <AppLogo variant="sidebar" />
          </Link>
        </div>
        <div className="flex items-center gap-4 text-white">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
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
            "ge-dropzone relative flex h-full w-full max-w-[1200px] flex-col items-center justify-center rounded-xl px-6 py-12 text-center",
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
      </main>
    </div>
  );
}
