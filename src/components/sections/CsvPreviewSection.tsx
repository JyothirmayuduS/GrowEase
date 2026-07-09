"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import type { ParsedCsv } from "@/lib/types/app";

interface CsvPreviewSectionProps {
  data: ParsedCsv;
  onConfirm: () => void;
  onBack: () => void;
}

export function CsvPreviewSection({ data, onConfirm, onBack }: CsvPreviewSectionProps) {
  const columns = useMemo<ColumnDef<Record<string, string>>[]>(
    () =>
      data.headers.map((header) => ({
        accessorKey: header,
        header,
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="block max-w-[200px] truncate" title={value}>
              {value || "—"}
            </span>
          );
        },
      })),
    [data.headers]
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col overflow-hidden bg-[#F5F8FC] px-6 py-6"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-[#6E6E6E] transition-colors hover:text-[#2C2C2C]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#1473E6]" />
              <div>
                <h2 className="text-lg font-bold text-[#2C2C2C]">{data.fileName}</h2>
                <p className="text-xs text-[#6E6E6E]">
                  {data.rows.length} rows · {(data.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="h-9 rounded-full bg-[#1473E6] px-6 text-sm font-semibold text-white hover:bg-[#0D66D0]"
          >
            Confirm Import
          </Button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border border-[#B3D4FF] bg-white">
          <DataTable columns={columns} data={data.rows} className="border-0" />
        </div>

        <p className="mt-3 text-center text-xs text-[#6E6E6E]">
          Review your data above. AI mapping begins only after you confirm.
        </p>
      </div>
    </motion.section>
  );
}
