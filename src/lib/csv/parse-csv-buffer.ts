import Papa from "papaparse";

import { normalizeCsv } from "@/lib/csv/normalize";

export interface ParsedCsvPayload {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  columnCount: number;
}

/**
 * Server-side CSV parse (Papa Parse).
 * Handles quoted commas/newlines, UTF-8 BOM (via normalizeCsv), and ragged rows.
 */
export function parseCsvBuffer(
  buffer: Buffer,
  fileName: string,
  fileSize: number
): ParsedCsvPayload {
  // Strip UTF-8 BOM if present before parse
  let text = buffer.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
  });

  // Fatal-ish errors only — mismatched field counts are warnings we tolerate
  const fatal = parsed.errors.filter(
    (e) => e.type === "Delimiter" || e.type === "Quotes" || e.code === "UndetectableDelimiter"
  );
  if (fatal.length > 0 && parsed.data.length === 0) {
    throw new Error(fatal[0]?.message || "Could not parse CSV");
  }

  const rawHeaders = parsed.meta.fields ?? [];
  const rawRows = parsed.data.filter((row) =>
    Object.values(row).some((v) => String(v ?? "").trim() !== "")
  );

  const { headers, rows } = normalizeCsv(rawHeaders, rawRows);

  return {
    fileName,
    fileSize,
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
  };
}
