"use client";

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
    <div
      className={cn(
        /* Mobile: normal block flow, no overflow trap */
        /* Desktop: fill remaining height in the sidebar layout */
        "flex flex-1 flex-col bg-[var(--ge-page)] md:min-h-0 md:overflow-hidden",
        className
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ge-border)] bg-[var(--ge-card)] px-5 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--ge-text-muted)]">
            <span className="truncate">{eyebrow}</span>
            <span className="opacity-60" aria-hidden="true">
              /
            </span>
            <span className="truncate font-semibold text-[var(--ge-text-secondary)]">{title}</span>
          </div>
          {description && (
            <p className="mt-1 truncate text-[12px] leading-snug text-[var(--ge-text-muted)]">
              {description}
            </p>
          )}
        </div>
        <ThemeToggle />
      </header>

      {/* Mobile: scroll naturally. Desktop: nested overflow-hidden for sidebar. */}
      <div className="flex flex-1 flex-col md:min-h-0 md:overflow-hidden">{children}</div>
    </div>
  );
}
