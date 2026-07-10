"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
 * Status cell: short preview always visible; full issue list on hover
 * (portal tooltip so scrollable tables do not clip it).
 */
export function RowStateBadge({
  state,
  className,
  variant = "pill",
  reason,
  reasons,
}: {
  state: RowState;
  className?: string;
  variant?: "pill" | "plain";
  reason?: string;
  reasons?: string[];
}) {
  const meta = META[state];
  const Icon = meta.Icon;
  const isPlain = variant === "plain";
  const uid = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const allReasons = (reasons?.length ? reasons : reason ? [reason] : []).filter(Boolean);
  const hasDetails = allReasons.length > 0;
  const preview =
    allReasons.length === 0
      ? null
      : allReasons.length === 1
        ? allReasons[0]
        : `${allReasons[0]} +${allReasons.length - 1}`;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const tipWidth = 300;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - tipWidth - 8
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < 140 ? Math.max(8, rect.top - 8) : rect.bottom + 6;
    setCoords({
      top,
      left,
    });
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-flex max-w-full", className)}
      onMouseEnter={() => hasDetails && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hasDetails && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        tabIndex={hasDetails ? 0 : undefined}
        aria-describedby={hasDetails && open ? `${uid}-status-tip` : undefined}
        className={cn(
          "inline-flex max-w-full items-center gap-1 text-[11px] font-semibold outline-none",
          isPlain
            ? meta.plainClassName
            : cn("rounded-[var(--ge-radius-sm)] border px-1.5 py-0.5", meta.pillClassName),
          hasDetails && "cursor-help"
        )}
      >
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="whitespace-nowrap">{meta.label}</span>
          {preview ? (
            <span className="font-normal">
              {" "}
              — <span>{preview}</span>
            </span>
          ) : null}
        </span>
      </span>

      {hasDetails && open && coords && typeof document !== "undefined"
        ? createPortal(
            <span
              id={`${uid}-status-tip`}
              role="tooltip"
              className="pointer-events-none fixed z-[100] w-max min-w-[200px] max-w-[320px] rounded-[var(--ge-radius-md)] border border-[var(--ge-border-strong)] bg-[var(--ge-card)] px-3 py-2.5 text-left shadow-lg"
              style={{
                top: coords.top,
                left: coords.left,
                transform:
                  coords.top < (triggerRef.current?.getBoundingClientRect().top ?? 0)
                    ? "translateY(-100%)"
                    : undefined,
              }}
            >
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
                {meta.label} · {allReasons.length} issue
                {allReasons.length === 1 ? "" : "s"}
              </span>
              <ul className="space-y-1.5">
                {allReasons.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-1.5 text-[12px] font-medium leading-snug text-[var(--ge-text)]"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ge-warning)]"
                      aria-hidden
                    />
                    <span className="whitespace-normal break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

export function FieldFlagBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-[var(--ge-radius-sm)] border border-[var(--ge-warning-border)] bg-[var(--ge-warning-tint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ge-warning-on-tint)]">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
