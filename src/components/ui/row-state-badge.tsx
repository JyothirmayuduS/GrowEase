"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { RowState } from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

const META: Record<
  RowState,
  {
    label: string;
    Icon: typeof CheckCircle2;
    pillClassName: string;
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

/**
 * Dual-coded status: icon + full text (wraps — never ellipsis the reason).
 * Use `variant="plain"` in Preview; pill on Results.
 */
export function RowStateBadge({
  state,
  className,
  variant = "pill",
  reason,
}: {
  state: RowState;
  className?: string;
  variant?: "pill" | "plain";
  reason?: string;
}) {
  const meta = META[state];
  const Icon = meta.Icon;
  const isPlain = variant === "plain";
  const fullLabel = reason ? `${meta.label} — ${reason}` : meta.label;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-start gap-1.5 text-left text-[11px] font-semibold leading-snug",
        isPlain
          ? meta.plainClassName
          : cn("rounded-[var(--ge-radius-sm)] border px-2 py-1", meta.pillClassName),
        className
      )}
      title={fullLabel}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 whitespace-normal break-words">
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
      <span className="whitespace-normal break-words">{label}</span>
    </span>
  );
}
