import Papa from "papaparse";

import { normalizeCsv } from "@/lib/csv/normalize";
import type { ParsedCsv } from "@/lib/types/app";

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        rows.push(results.data);
      },
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV parse warnings:", results.errors);
        }
        const { headers, rows: normalizedRows } = normalizeCsv(results.meta.fields ?? [], rows);
        resolve({
          fileName: file.name,
          fileSize: file.size,
          headers,
          rows: normalizedRows,
        });
      },
      error: (error) => reject(error),
    });
  });
}
