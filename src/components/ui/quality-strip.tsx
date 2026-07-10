"use client";

import type { QualitySummary, RowState } from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

interface QualityStripProps {
  summary: QualitySummary;
  active?: RowState | "all";
  onSelect?: (filter: RowState | "all") => void;
  className?: string;
}

/**
 * Clickable filter tabs (Total / Clean / Needs review / Skipped).
 * Colored numbers stay; selected state is a calm panel fill (no accent ring).
 */
export function QualityStrip({ summary, active = "all", onSelect, className }: QualityStripProps) {
  const items: { key: RowState | "all"; label: string; value: number; tone?: string }[] = [
    { key: "all", label: "Total", value: summary.total },
    { key: "clean", label: "Clean", value: summary.clean, tone: "success" },
    { key: "needs_review", label: "Needs review", value: summary.needsReview, tone: "warning" },
    { key: "skipped", label: "Skipped", value: summary.skipped, tone: "danger" },
  ];

  const interactive = Boolean(onSelect);

  return (
    <div
      role="group"
      aria-label="Filter rows by quality"
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-border)] sm:grid-cols-4",
        className
      )}
    >
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect?.(item.key)}
            disabled={!interactive}
            className={cn(
              "bg-[var(--ge-card)] px-4 py-3 text-left transition-colors",
              interactive && "cursor-pointer hover:bg-[var(--ge-panel)]",
              interactive && selected && "bg-[var(--ge-panel)]",
              !interactive && "cursor-default"
            )}
            aria-pressed={interactive ? selected : undefined}
          >
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]">
              {item.label}
            </div>
            <div
              className={cn(
                "font-display text-[22px] font-semibold leading-none tabular-nums sm:text-[26px]",
                item.tone === "success" && "text-[var(--ge-success)]",
                item.tone === "warning" && "text-[var(--ge-warning)]",
                item.tone === "danger" && "text-[var(--ge-danger)]",
                !item.tone && "text-[var(--ge-text)]"
              )}
            >
              {item.value}
            </div>
          </button>
        );
      })}
    </div>
  );
}
