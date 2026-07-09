"use client";

import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PageBadge {
  label: string;
  tone?: "blue" | "green" | "amber" | "muted";
}

interface ImportPageToolbarProps {
  onBack: () => void;
  backLabel?: string;
  fileName: string;
  badges?: PageBadge[];
  icon: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ImportPageToolbar({
  onBack,
  backLabel = "Back",
  fileName,
  badges = [],
  icon,
  actions,
  className,
}: ImportPageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>

        <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1473E6] text-white">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {fileName}
            </h1>
            {badges.length > 0 && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {badges.map((badge, i) => (
                  <span key={badge.label}>
                    {i > 0 && <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>}
                    <span
                      className={cn(
                        badge.tone === "green" && "font-medium text-green-600 dark:text-green-400",
                        badge.tone === "amber" && "font-medium text-amber-600 dark:text-amber-400",
                        badge.tone === "blue" && "font-medium text-[#1473E6] dark:text-blue-400"
                      )}
                    >
                      {badge.label}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
