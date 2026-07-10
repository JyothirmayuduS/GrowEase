"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { RowState } from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

const META: Record<
  RowState,
  {
    label: string;
    Icon: typeof CheckCircle2;
    /** Filled pill — used outside Preview Status column (e.g. skipped collapse). */
    pillClassName: string;
    /** Unfilled label — Preview Status column (calm; field tags carry the alert). */
    plainClassName: string;
  }
> = {
  clean: {
    label: "Clean",
    Icon: CheckCircle2,
    pillClassName:
      "bg-[var(--ge-success-tint)] text-[var(--ge-success-on-tint)] border-[var(--ge-success-border)]",
    plainClassName: "text-[var(--ge-success-on-tint)]",
  },
  needs_review: {
    label: "Needs review",
    Icon: AlertTriangle,
    pillClassName:
      "bg-[var(--ge-warning-tint)] text-[var(--ge-warning-on-tint)] border-[var(--ge-warning-border)]",
    plainClassName: "text-[var(--ge-warning-on-tint)]",
  },
  skipped: {
    label: "Skipped",
    Icon: XCircle,
    pillClassName:
      "bg-[var(--ge-danger-tint)] text-[var(--ge-danger-on-tint)] border-[var(--ge-danger-border)]",
    plainClassName: "text-[var(--ge-danger-on-tint)]",
  },
};

/** Dual-coded status: icon + text. Use `variant="plain"` in Preview Status column. */
export function RowStateBadge({
  state,
  className,
  variant = "pill",
  reason,
}: {
  state: RowState;
  className?: string;
  variant?: "pill" | "plain";
  /** Compact reason when no field tag is visible (orphan / scrolled-off flag). */
  reason?: string;
}) {
  const meta = META[state];
  const Icon = meta.Icon;
  const isPlain = variant === "plain";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-[11px] font-semibold",
        isPlain
          ? meta.plainClassName
          : cn(
              "rounded-[var(--ge-radius-sm)] border px-1.5 py-0.5",
              meta.pillClassName
            ),
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {meta.label}
        {reason ? <span className="font-normal"> — {reason}</span> : null}
      </span>
    </span>
  );
}

/** Filled amber tag under the specific field that triggered the flag. */
export function FieldFlagBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-[var(--ge-radius-sm)] border border-[var(--ge-warning-border)] bg-[var(--ge-warning-tint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ge-warning-on-tint)]">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
