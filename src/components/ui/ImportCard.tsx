"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImportCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  size?: "md" | "lg";
}

export function ImportCard({
  title,
  description,
  children,
  footer,
  onClose,
  className,
  size = "md",
}: ImportCardProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-[var(--ge-border)] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:border-slate-700 dark:bg-slate-900",
        size === "lg" ? "max-w-4xl" : "max-w-2xl",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--ge-border)] px-6 py-5 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-[var(--ge-text)] dark:text-slate-50">{title}</h2>
          {description && (
            <p className="mt-1 text-[13px] text-[var(--ge-text-muted)] dark:text-slate-400">
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

      <div className="px-6 py-5">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-[var(--ge-border)] bg-[var(--ge-surface)] px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
          {footer}
        </div>
      )}
    </div>
  );
}
