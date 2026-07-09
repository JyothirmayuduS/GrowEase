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
  getCellValue?: (row: Record<string, string>, header: string) => string;
}

export function VirtualTable({
  headers,
  rows,
  rowHeight = 44,
  maxHeight = "min(60vh, 520px)",
  className,
  getCellValue = (row, header) => row[header] ?? "",
}: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ maxHeight }}
    >
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-[#FAFAFA] dark:bg-slate-900">
          <tr className="border-b border-[#E8E8E8] dark:border-slate-700">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-[13px] font-semibold text-[#2C2C2C] dark:text-slate-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(headers.length, 1)}
                className="px-4 py-8 text-center text-[13px] text-[#6E6E6E]"
              >
                No rows found.
              </td>
            </tr>
          ) : (
            <>
              {virtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} aria-hidden="true">
                  <td colSpan={headers.length} />
                </tr>
              )}
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={virtualRow.key}
                    className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA] dark:border-slate-800 dark:hover:bg-slate-900"
                    style={{ height: rowHeight }}
                  >
                    {headers.map((header) => {
                      const value = getCellValue(row, header);
                      return (
                        <td
                          key={header}
                          className="px-4 py-3 text-[13px] text-[#505050] dark:text-slate-300"
                        >
                          <span className="block max-w-[240px] truncate" title={value}>
                            {value?.trim() ? value : "—"}
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
                  <td colSpan={headers.length} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
