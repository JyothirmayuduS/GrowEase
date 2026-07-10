"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}) {
  return (
    <div className="rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)] px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-display text-[26px] font-semibold tabular-nums leading-none",
          tone === "success" && "text-[var(--ge-success)]",
          tone === "warning" && "text-[var(--ge-warning)]",
          tone === "danger" && "text-[var(--ge-danger)]",
          tone === "accent" && "text-[var(--ge-accent)]",
          (!tone || tone === "default") && "text-[var(--ge-text)]"
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] text-[var(--ge-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function PageSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--ge-border)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[var(--ge-text)]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[12.5px] text-[var(--ge-text-muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-[var(--ge-radius-xl)] border border-dashed border-[var(--ge-border-strong)] bg-[var(--ge-panel)] px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-[var(--ge-text)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-[var(--ge-text-secondary)]">
        {description}
      </p>
      {href && cta ? (
        <Link href={href} className="ge-btn-primary mt-5 inline-flex px-4 py-2 text-[13px]">
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone === "success" &&
          "border-[var(--ge-success-border)] bg-[var(--ge-success-tint)] text-[var(--ge-success-on-tint)]",
        tone === "warning" &&
          "border-[var(--ge-warning-border)] bg-[var(--ge-warning-tint)] text-[var(--ge-warning-on-tint)]",
        tone === "danger" &&
          "border-[var(--ge-danger-border)] bg-[var(--ge-danger-tint)] text-[var(--ge-danger-on-tint)]",
        tone === "accent" &&
          "border-[var(--ge-accent)]/30 bg-[var(--ge-accent-tint)] text-[var(--ge-accent)]",
        tone === "muted" &&
          "border-[var(--ge-border)] bg-[var(--ge-panel)] text-[var(--ge-text-secondary)]"
      )}
    >
      {label}
    </span>
  );
}

export function EnterpriseTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="ge-table-scroll overflow-x-auto">
      <table className="ge-results-table w-full min-w-[640px] text-left">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "bg-[var(--ge-panel)] px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]",
                  i < headers.length - 1 ? "ge-col-rule" : "ge-col-rule-last"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, ri) => (
            <tr key={ri} className="bg-[var(--ge-card)] hover:bg-[var(--ge-panel)]">
              {cells.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-3.5 py-2.5 text-[13px] text-[var(--ge-text)]",
                    ci < cells.length - 1 ? "ge-col-rule" : "ge-col-rule-last"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
