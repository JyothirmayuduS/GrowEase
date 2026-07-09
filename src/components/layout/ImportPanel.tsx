"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImportPanelProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

/** Full-width panel filling the main content area (GrowEasy + Adobe style). */
export function ImportPanel({
  title,
  description,
  children,
  footer,
  onClose,
  className,
}: ImportPanelProps) {
  const showHeader = Boolean(title || description || onClose);

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col bg-white dark:bg-slate-950", className)}>
      {showHeader && (
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--ge-border)] px-8 py-5 dark:border-slate-800">
          <div>
            {title && (
              <h2 className="text-[17px] font-bold tracking-tight text-[var(--ge-text)] dark:text-slate-50">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ge-text-muted)] dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--ge-text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--ge-text)] dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5 [&>*]:min-h-0">{children}</div>

      {footer && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--ge-border)] bg-[var(--ge-surface)] px-8 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          {footer}
        </div>
      )}
    </div>
  );
}
