"use client";

import { ChevronRight } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

interface LeadSourcesPageProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}

/** Full-height page shell with a single compact header row. */
export function LeadSourcesPage({
  title = "Lead Sources",
  description,
  eyebrow = "Lead Sources",
  children,
  className,
}: LeadSourcesPageProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950", className)}>
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ge-border)] px-6 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ge-text-muted)] dark:text-slate-400">
            <span className="truncate">{eyebrow}</span>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
            <span className="truncate text-[var(--ge-text)] dark:text-slate-200">{title}</span>
          </div>
          {description && (
            <p className="mt-1 truncate text-[12px] leading-snug text-[var(--ge-text-muted)] dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        <ThemeToggle />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
