"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { cn } from "@/lib/utils";

interface VirtualTableProps {
  headers: string[];
  rows: Record<string, string>[];
  rowHeight?: number;
  maxHeight?: string;
  className?: string;
  showRowNumbers?: boolean;
  variant?: "default" | "preview" | "groweasy";
  getCellValue?: (row: Record<string, string>, header: string) => string;
}

export function VirtualTable({
  headers,
  rows,
  rowHeight,
  maxHeight = "min(60vh, 520px)",
  className,
  showRowNumbers = false,
  variant = "default",
  getCellValue = (row, header) => row[header] ?? "",
}: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isPreview = variant === "preview";
  const isGroweasy = variant === "groweasy";
  const isStyled = isPreview || isGroweasy;
  const resolvedRowHeight = rowHeight ?? (isGroweasy ? 40 : 44);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => resolvedRowHeight,
    overscan: 10,
  });

  const colSpan = headers.length + (showRowNumbers ? 1 : 0);

  return (
    <div
      ref={parentRef}
      className={cn("h-full overflow-auto", isStyled && "scrollbar-thin", className)}
      style={{ maxHeight }}
    >
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr
            className={cn(
              "border-b",
              isGroweasy
                ? "border-[var(--ge-border)] bg-[#fafbfc] dark:border-slate-800 dark:bg-slate-900/95"
                : isPreview
                  ? "border-slate-200 bg-[#fafbfc] dark:border-slate-800 dark:bg-slate-900/95"
                  : "border-[#E8E8E8] bg-[#FAFAFA] dark:border-slate-700 dark:bg-slate-900"
            )}
          >
            {showRowNumbers && (
              <th
                className={cn(
                  "sticky left-0 z-[11] w-11 bg-inherit text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--ge-text-muted)]",
                  isGroweasy ? "px-2.5 py-2" : "px-3 py-2.5"
                )}
              >
                #
              </th>
            )}
            {headers.map((header) => (
              <th
                key={header}
                className={cn(
                  "text-left whitespace-nowrap",
                  isGroweasy
                    ? "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ge-text-muted)] dark:text-slate-500"
                    : isPreview
                      ? "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ge-text-muted)] dark:text-slate-500"
                      : "px-4 py-3 text-[13px] font-semibold text-[#2C2C2C] dark:text-slate-100"
                )}
              >
                {isGroweasy ? header.replace(/\s+/g, "_").toUpperCase() : header.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(colSpan, 1)}
                className="px-4 py-12 text-center text-[13px] text-slate-500"
              >
                No rows found.
              </td>
            </tr>
          ) : (
            <>
              {virtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} aria-hidden="true">
                  <td colSpan={colSpan} />
                </tr>
              )}
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                const isEven = virtualRow.index % 2 === 0;
                return (
                  <tr
                    key={virtualRow.key}
                    className={cn(
                      "group border-b transition-colors",
                      isStyled
                        ? cn(
                            "border-[var(--ge-border)]/70 dark:border-slate-800/80",
                            isGroweasy
                              ? cn(
                                  isEven
                                    ? "bg-white dark:bg-slate-900"
                                    : "bg-[#fbfcfd] dark:bg-slate-900/60",
                                  "hover:bg-[#f0f6ff] dark:hover:bg-slate-800/70"
                                )
                              : isEven
                                ? "bg-white dark:bg-slate-900"
                                : "bg-slate-50/60 dark:bg-slate-900/50",
                            !isGroweasy && "hover:bg-[#f8f9fa] dark:hover:bg-slate-800/50"
                          )
                        : "border-[#F0F0F0] hover:bg-[#FAFAFA] dark:border-slate-800 dark:hover:bg-slate-900"
                    )}
                    style={{ height: resolvedRowHeight }}
                  >
                    {showRowNumbers && (
                      <td
                        className={cn(
                          "sticky left-0 z-[1] px-2.5 text-center text-[11px] font-medium tabular-nums text-slate-400",
                          isEven
                            ? "bg-white group-hover:bg-[#f0f6ff] dark:bg-slate-900 dark:group-hover:bg-slate-800/70"
                            : "bg-[#fbfcfd] group-hover:bg-[#f0f6ff] dark:bg-slate-900/60 dark:group-hover:bg-slate-800/70"
                        )}
                      >
                        {virtualRow.index + 1}
                      </td>
                    )}
                    {headers.map((header) => {
                      const value = getCellValue(row, header);
                      const isEmpty = !value?.trim();
                      const isReason = header === "REASON";
                      return (
                        <td
                          key={header}
                          className={cn(
                            isGroweasy || isPreview ? "px-3 py-2" : "px-4 py-3",
                            "text-[12.5px] leading-snug text-[var(--ge-text)] dark:text-slate-300"
                          )}
                        >
                          <span
                            className={cn(
                              "block truncate",
                              header === "SOURCE DATA" ? "max-w-[420px]" : "max-w-[200px]",
                              isEmpty && "text-slate-300 dark:text-slate-600",
                              isReason && !isEmpty && "font-medium text-amber-700 dark:text-amber-400"
                            )}
                            title={value}
                          >
                            {isEmpty ? "—" : value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {virtualizer.getVirtualItems().length > 0 && (
                <tr
                  style={{
                    height:
                      virtualizer.getTotalSize() -
                      (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  }}
                  aria-hidden="true"
                >
                  <td colSpan={colSpan} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
