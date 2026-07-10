"use client";

import { useId, useMemo, useState } from "react";

import type { StatusBreakdown } from "@/lib/validation/quality-breakdown";
import type { QualitySummary, RowState } from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

type SliceKey = Exclude<RowState, never>;

const SLICES: {
  key: SliceKey;
  label: string;
  color: string;
}[] = [
  { key: "clean", label: "Clean", color: "var(--ge-success)" },
  { key: "needs_review", label: "Needs review", color: "var(--ge-warning)" },
  { key: "skipped", label: "Skipped", color: "var(--ge-danger)" },
];

interface QualityPieChartProps {
  summary: QualitySummary;
  breakdown: StatusBreakdown;
  active?: RowState | "all";
  onSelect?: (filter: RowState | "all") => void;
  className?: string;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startDeg: number,
  endDeg: number
): string {
  const sweep = endDeg - startDeg;
  if (sweep <= 0.01) return "";
  if (sweep >= 359.9) {
    const top = polar(cx, cy, outer, 0);
    const bottom = polar(cx, cy, outer, 180);
    const topIn = polar(cx, cy, inner, 0);
    const bottomIn = polar(cx, cy, inner, 180);
    return [
      `M ${top.x} ${top.y}`,
      `A ${outer} ${outer} 0 1 1 ${bottom.x} ${bottom.y}`,
      `A ${outer} ${outer} 0 1 1 ${top.x} ${top.y}`,
      `M ${topIn.x} ${topIn.y}`,
      `A ${inner} ${inner} 0 1 0 ${bottomIn.x} ${bottomIn.y}`,
      `A ${inner} ${inner} 0 1 0 ${topIn.x} ${topIn.y}`,
      "Z",
    ].join(" ");
  }

  const large = sweep > 180 ? 1 : 0;
  const o1 = polar(cx, cy, outer, startDeg);
  const o2 = polar(cx, cy, outer, endDeg);
  const i2 = polar(cx, cy, inner, endDeg);
  const i1 = polar(cx, cy, inner, startDeg);

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

/**
 * Status donut: Clean / Needs review / Skipped.
 * Hover a slice or legend row to see what's missing (issue counts).
 * Click to filter the table.
 */
export function QualityPieChart({
  summary,
  breakdown,
  active = "all",
  onSelect,
  className,
}: QualityPieChartProps) {
  const uid = useId();
  const [hovered, setHovered] = useState<SliceKey | null>(null);

  const total = Math.max(summary.total, 1);
  const counts: Record<SliceKey, number> = {
    clean: summary.clean,
    needs_review: summary.needsReview,
    skipped: summary.skipped,
  };

  const arcs = useMemo(() => {
    let angle = 0;
    return SLICES.map((slice) => {
      const value = counts[slice.key];
      const sweep = (value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { ...slice, value, start, end };
    }).filter((s) => s.value > 0);
  }, [summary.clean, summary.needsReview, summary.skipped, total]);

  const focus = hovered ?? (active !== "all" ? (active as SliceKey) : null);
  const tip = focus ? breakdown[focus] : null;
  const tipMeta = focus ? SLICES.find((s) => s.key === focus) : null;

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 52;
  const inner = 30;

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)] p-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-labelledby={`${uid}-title`}
          >
            <title id={`${uid}-title`}>
              Row status: {summary.clean} clean, {summary.needsReview} need review,{" "}
              {summary.skipped} skipped
            </title>

            {summary.total === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={(outer + inner) / 2}
                fill="none"
                stroke="var(--ge-border)"
                strokeWidth={outer - inner}
              />
            ) : (
              arcs.map((arc) => {
                const d = donutPath(cx, cy, outer, inner, arc.start, arc.end);
                const isFocus = focus === arc.key;
                const dimmed = focus !== null && !isFocus;
                return (
                  <path
                    key={arc.key}
                    d={d}
                    fill={arc.color}
                    opacity={dimmed ? 0.35 : 1}
                    className="cursor-pointer outline-none transition-opacity duration-150"
                    style={{
                      transformOrigin: `${cx}px ${cy}px`,
                      transform: isFocus ? "scale(1.04)" : undefined,
                    }}
                    onMouseEnter={() => setHovered(arc.key)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(arc.key)}
                    onBlur={() => setHovered(null)}
                    onClick={() => onSelect?.(arc.key)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${arc.label}: ${arc.value} rows`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect?.(arc.key);
                      }
                    }}
                  />
                );
              })
            )}

            <circle cx={cx} cy={cy} r={inner - 1} fill="var(--ge-card)" />
            <text
              x={cx}
              y={cy - 5}
              textAnchor="middle"
              fill="var(--ge-text)"
              style={{ fontSize: 16, fontWeight: 600 }}
            >
              {summary.total}
            </text>
            <text
              x={cx}
              y={cy + 9}
              textAnchor="middle"
              fill="var(--ge-text-muted)"
              style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.06em" }}
            >
              ROWS
            </text>
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]">
            Status mix
          </p>
          <ul className="space-y-1">
            {SLICES.map((slice) => {
              const value = counts[slice.key];
              const pct = summary.total ? Math.round((value / summary.total) * 100) : 0;
              const selected = active === slice.key;
              return (
                <li key={slice.key}>
                  <button
                    type="button"
                    disabled={!onSelect}
                    onClick={() => onSelect?.(slice.key)}
                    onMouseEnter={() => setHovered(slice.key)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[var(--ge-radius-sm)] px-1.5 py-1 text-left transition-colors",
                      onSelect && "hover:bg-[var(--ge-panel)]",
                      selected && "bg-[var(--ge-panel)]",
                      !onSelect && "cursor-default"
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: value > 0 ? slice.color : "var(--ge-border)" }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--ge-text)]">
                      {slice.label}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--ge-text-secondary)]">
                      {value}
                    </span>
                    <span className="w-8 text-right font-mono text-[10px] tabular-nums text-[var(--ge-text-muted)]">
                      {pct}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Inline hover details — never clipped by parent overflow */}
      <div
        className="min-h-[88px] rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2.5"
        aria-live="polite"
      >
        {tip && tipMeta && tip.count > 0 ? (
          <>
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: tipMeta.color }}
                aria-hidden
              />
              <p className="text-[11px] font-semibold text-[var(--ge-text)]">
                {tipMeta.label}
                <span className="ml-1 font-mono font-normal text-[var(--ge-text-muted)]">
                  · {tip.count} row{tip.count === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <ul className="space-y-1">
              {tip.issues.slice(0, 5).map((issue) => (
                <li
                  key={issue.label}
                  className="flex items-start justify-between gap-3 text-[11px] leading-snug"
                >
                  <span className="min-w-0 text-[var(--ge-text-secondary)]">{issue.label}</span>
                  <span className="shrink-0 font-mono font-semibold tabular-nums text-[var(--ge-text)]">
                    ×{issue.count}
                  </span>
                </li>
              ))}
              {tip.issues.length > 5 && (
                <li className="text-[10px] text-[var(--ge-text-muted)]">
                  +{tip.issues.length - 5} more
                </li>
              )}
            </ul>
          </>
        ) : (
          <p className="text-[11px] leading-relaxed text-[var(--ge-text-muted)]">
            Hover a slice to see what&apos;s missing — e.g. missing name, multiple emails,
            suspicious phone.
          </p>
        )}
      </div>

      {onSelect && active !== "all" && (
        <button
          type="button"
          onClick={() => onSelect("all")}
          className="self-start text-[11px] font-semibold text-[var(--ge-accent)] hover:underline"
        >
          Show all rows
        </button>
      )}
    </div>
  );
}
