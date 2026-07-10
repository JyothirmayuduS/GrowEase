"use client";

import { useId, useMemo, useState } from "react";

import type { QualitySummary, RowState } from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

type SliceKey = RowState | "all";

interface QualityPieChartProps {
  summary: QualitySummary;
  active?: RowState | "all";
  onSelect?: (filter: RowState | "all") => void;
  className?: string;
  size?: number;
}

const SLICES: {
  key: RowState;
  label: string;
  color: string;
  countKey: keyof Pick<QualitySummary, "clean" | "needsReview" | "skipped">;
}[] = [
  { key: "clean", label: "Clean", color: "var(--ge-success)", countKey: "clean" },
  {
    key: "needs_review",
    label: "Needs review",
    color: "var(--ge-warning)",
    countKey: "needsReview",
  },
  { key: "skipped", label: "Skipped", color: "var(--ge-danger)", countKey: "skipped" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Donut quality chart — replaces Total/Clean/Needs review/Skipped cards.
 * Hover for full breakdown; click a slice or legend chip to filter the table.
 */
export function QualityPieChart({
  summary,
  active = "all",
  onSelect,
  className,
  size = 76,
}: QualityPieChartProps) {
  const uid = useId();
  const [hovered, setHovered] = useState<SliceKey | null>(null);
  const total = Math.max(summary.total, 1);

  const segments = useMemo(() => {
    let angle = 0;
    return SLICES.map((slice) => {
      const count = summary[slice.countKey];
      const sweep = (count / total) * 360;
      const start = angle;
      const end = angle + Math.max(sweep, count > 0 ? 0.01 : 0);
      angle = end;
      return { ...slice, count, start, end, pct: Math.round((count / total) * 100) };
    }).filter((s) => s.count > 0);
  }, [summary, total]);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.58;
  const interactive = Boolean(onSelect);

  const tipKey: SliceKey | null =
    hovered ?? (active !== "all" ? active : null);
  const tipSlice =
    tipKey && tipKey !== "all" ? SLICES.find((s) => s.key === tipKey) : null;
  const tipCount = tipSlice ? summary[tipSlice.countKey] : summary.total;
  const tipLabel = tipSlice ? tipSlice.label : "All rows";
  const tipPct = Math.round((tipCount / total) * 100);
  const showTip = Boolean(hovered);

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)] px-4 py-3",
        className
      )}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-labelledby={`${uid}-title`}
        >
          <title id={`${uid}-title`}>
            {summary.clean} clean, {summary.needsReview} need review, {summary.skipped} skipped
            of {summary.total}
          </title>
          {summary.total === 0 ? (
            <circle cx={cx} cy={cy} r={outerR} fill="var(--ge-border)" />
          ) : segments.length === 1 ? (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={outerR}
                fill={segments[0].color}
                className={cn(interactive && "cursor-pointer")}
                onMouseEnter={() => setHovered(segments[0].key)}
                onClick={() => onSelect?.(segments[0].key)}
              />
              <circle cx={cx} cy={cy} r={innerR} fill="var(--ge-card)" />
            </>
          ) : (
            segments.map((seg) => {
              // Near-full arcs: SVG arc can't do exactly 360°, clamp end
              const end = Math.min(seg.end, seg.start + 359.999);
              const oStart = polar(cx, cy, outerR, seg.start);
              const oEnd = polar(cx, cy, outerR, end);
              const iStart = polar(cx, cy, innerR, end);
              const iEnd = polar(cx, cy, innerR, seg.start);
              const large = end - seg.start > 180 ? 1 : 0;
              const d = [
                `M ${oStart.x} ${oStart.y}`,
                `A ${outerR} ${outerR} 0 ${large} 1 ${oEnd.x} ${oEnd.y}`,
                `L ${iStart.x} ${iStart.y}`,
                `A ${innerR} ${innerR} 0 ${large} 0 ${iEnd.x} ${iEnd.y}`,
                "Z",
              ].join(" ");
              const dimmed = active !== "all" && active !== seg.key && hovered !== seg.key;
              return (
                <path
                  key={seg.key}
                  d={d}
                  fill={seg.color}
                  opacity={dimmed ? 0.35 : 1}
                  stroke="var(--ge-card)"
                  strokeWidth={1.5}
                  className={cn(interactive && "cursor-pointer transition-opacity")}
                  onMouseEnter={() => setHovered(seg.key)}
                  onClick={() => onSelect?.(seg.key)}
                />
              );
            })
          )}
          <circle cx={cx} cy={cy} r={innerR - 0.5} fill="var(--ge-card)" />
          <text
            x={cx}
            y={cy - 3}
            textAnchor="middle"
            fill="currentColor"
            className="text-[var(--ge-text)]"
            style={{ fontSize: 15, fontWeight: 700 }}
          >
            {summary.total}
          </text>
          <text
            x={cx}
            y={cy + 11}
            textAnchor="middle"
            fill="currentColor"
            className="text-[var(--ge-text-muted)]"
            style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.05em" }}
          >
            TOTAL
          </text>
        </svg>
      </div>

      <div className="min-w-0 flex-1" role="group" aria-label="Filter by quality">
        <button
          type="button"
          onClick={() => onSelect?.("all")}
          onMouseEnter={() => setHovered("all")}
          disabled={!interactive}
          className={cn(
            "mb-2 text-left text-[12px] font-semibold text-[var(--ge-text)]",
            interactive && "hover:text-[var(--ge-accent)]",
            active === "all" && "text-[var(--ge-accent)]"
          )}
        >
          Row quality
          <span className="ml-1.5 font-normal text-[var(--ge-text-muted)]">
            · hover for details
          </span>
        </button>
        <div className="flex flex-wrap gap-1.5">
          {SLICES.map((s) => {
            const count = summary[s.countKey];
            const selected = active === s.key;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!interactive}
                onMouseEnter={() => setHovered(s.key)}
                onClick={() => onSelect?.(s.key)}
                aria-pressed={interactive ? selected : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  selected
                    ? "border-[var(--ge-border-strong)] bg-[var(--ge-panel)] text-[var(--ge-text)]"
                    : "border-[var(--ge-border)] bg-[var(--ge-card)] text-[var(--ge-text-secondary)] hover:bg-[var(--ge-panel)]",
                  !interactive && "cursor-default"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden
                />
                {s.label}
                <span className="font-mono tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover detail panel — full counts, never truncated */}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute right-3 top-3 z-20 w-[210px] rounded-[var(--ge-radius-md)] border border-[var(--ge-border-strong)] bg-[var(--ge-card)] px-3 py-2.5 shadow-lg transition-opacity duration-150",
          showTip ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
          {tipLabel}
        </p>
        <p className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums text-[var(--ge-text)]">
          {tipCount}{" "}
          <span className="text-[12px] font-medium text-[var(--ge-text-muted)]">({tipPct}%)</span>
        </p>
        <ul className="mt-2 space-y-1 border-t border-[var(--ge-border)] pt-2">
          {SLICES.map((s) => (
            <li
              key={s.key}
              className={cn(
                "flex items-center justify-between gap-2 text-[11px]",
                tipKey === s.key
                  ? "font-semibold text-[var(--ge-text)]"
                  : "text-[var(--ge-text-secondary)]"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden
                />
                {s.label}
              </span>
              <span className="font-mono tabular-nums text-[var(--ge-text)]">
                {summary[s.countKey]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
