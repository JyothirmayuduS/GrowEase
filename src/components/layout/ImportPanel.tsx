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

/** Full-width panel filling the main content area. Flat surfaces only. */
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
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col bg-[var(--ge-page)]",
        className
      )}
    >
      {showHeader && (
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--ge-border)] bg-[var(--ge-card)] px-5 py-4 sm:px-8 sm:py-5">
          <div>
            {title && (
              <h2 className="font-display text-[17px] font-semibold tracking-tight text-[var(--ge-text)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ge-text-secondary)]">
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-[var(--ge-radius-md)] p-1.5 text-[var(--ge-text-muted)] transition-colors hover:bg-[var(--ge-panel)] hover:text-[var(--ge-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5 [&>*]:min-h-0">
        {children}
      </div>

      {footer && (
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--ge-border)] bg-[var(--ge-card)] px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
}
