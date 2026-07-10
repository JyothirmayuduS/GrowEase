"use client";

import { FileSpreadsheet, Sparkles, Users } from "lucide-react";

import { ImportDoodles } from "@/components/features/csv-import/ImportDoodles";
import { clampProgress } from "@/lib/import-progress";

/** Unique words only — no duplicate labels in the visible cycle */
const CYCLING_WORDS = ["columns", "fields", "records", "leads"] as const;

export interface ImportProgressLoaderProps {
  progress: number;
  status: string;
  fileName?: string;
}

export function ImportProgressLoader({ progress, fileName }: ImportProgressLoaderProps) {
  const clamped = clampProgress(progress);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[var(--ge-page-bg)] px-6 py-12 dark:bg-slate-950">
      <ImportDoodles />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-[var(--ge-border)] bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--brand-blue)] shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
          <Sparkles className="h-3.5 w-3.5" />
          AI lead import
        </div>

        <div className="import-word-loader" aria-live="polite" aria-busy="true">
          <p className="import-word-loader__prefix">Importing</p>
          <div className="import-word-loader__words">
            {CYCLING_WORDS.map((word) => (
              <span key={word} className="import-word-loader__word">
                {word}
              </span>
            ))}
            <span className="import-word-loader__word" aria-hidden="true">
              {CYCLING_WORDS[0]}
            </span>
          </div>
        </div>

        {fileName && (
          <div className="mt-8 flex max-w-md items-center gap-2.5 rounded-xl border border-[var(--ge-border)] bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <FileSpreadsheet className="h-4 w-4 text-[var(--brand-blue)]" />
            </div>
            <p className="min-w-0 truncate text-sm font-medium text-[var(--ge-text)] dark:text-slate-200">
              {fileName}
            </p>
          </div>
        )}

        <div className="mt-10 w-full max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-[var(--ge-text-muted)] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Building your CRM pipeline
            </span>
            <span className="tabular-nums text-[var(--ge-text)] dark:text-slate-200">
              {Math.round(clamped)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white shadow-inner dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1473e6] to-[#3b9eff] transition-[width] duration-500 ease-out"
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
