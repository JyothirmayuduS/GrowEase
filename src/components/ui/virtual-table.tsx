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
  rowHeight = 48,
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

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const colSpan = headers.length + (showRowNumbers ? 1 : 0);

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", isStyled && "scrollbar-thin", className)}
      style={{ maxHeight }}
    >
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr
            className={cn(
              "border-b",
              isGroweasy
                ? "border-[var(--ge-border)] bg-white dark:border-slate-700 dark:bg-slate-900"
                : isPreview
                  ? "border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900"
                  : "border-[#E8E8E8] bg-[#FAFAFA] dark:border-slate-700 dark:bg-slate-900"
            )}
          >
            {showRowNumbers && (
              <th className="w-12 px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                #
              </th>
            )}
            {headers.map((header) => (
              <th
                key={header}
                className={cn(
                  "px-4 py-3 text-left whitespace-nowrap",
                  isGroweasy
                    ? "text-[11px] font-bold uppercase tracking-wide text-[var(--ge-text)] dark:text-slate-200"
                    : isPreview
                      ? "py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      : "py-3.5 text-[13px] font-semibold text-[#2C2C2C] dark:text-slate-100"
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
                      "border-b transition-colors",
                      isStyled
                        ? cn(
                            "border-[var(--ge-border)] dark:border-slate-800",
                            !isGroweasy && isEven
                              ? "bg-white dark:bg-slate-900"
                              : !isGroweasy
                                ? "bg-slate-50/70 dark:bg-slate-900/50"
                                : "bg-white dark:bg-slate-900",
                            "hover:bg-[#f8f9fa] dark:hover:bg-slate-800/50"
                          )
                        : "border-[#F0F0F0] hover:bg-[#FAFAFA] dark:border-slate-800 dark:hover:bg-slate-900"
                    )}
                    style={{ height: rowHeight }}
                  >
                    {showRowNumbers && (
                      <td className="px-3 text-center text-xs font-medium tabular-nums text-slate-400">
                        {virtualRow.index + 1}
                      </td>
                    )}
                    {headers.map((header) => {
                      const value = getCellValue(row, header);
                      const isEmpty = !value?.trim();
                      return (
                        <td
                          key={header}
                          className={cn(
                            "px-4 py-3",
                            isStyled
                              ? "text-[13px] text-[var(--ge-text)] dark:text-slate-300"
                              : "text-[13px] text-[#505050] dark:text-slate-300"
                          )}
                        >
                          <span
                            className={cn(
                              "block max-w-[260px] truncate",
                              isEmpty && "italic text-slate-300 dark:text-slate-600"
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
