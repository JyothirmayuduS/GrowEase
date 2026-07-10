/**
 * CsvExportService
 *
 * Generates safe, compliant CSV output for CRM records.
 *
 * Rules:
 * - UTF-8 BOM for Excel compatibility
 * - Proper CSV quoting (RFC 4180)
 * - Formula injection prefixing at export time only (never mutates canonical data)
 * - Unicode names preserved intact
 * - One record per row
 * - Line breaks within cells replaced with \n literal
 */

import { CRM_FIELDS, CRM_FIELD_LABELS } from "@/lib/constants/crm";
import type { CrmLeadRecord } from "@/lib/types/crm";
import { escapeCsvFormulaForExport } from "@/lib/services/SanitizationService";

// UTF-8 BOM for Excel compatibility
const UTF8_BOM = "\uFEFF";

/**
 * Escape a cell value for CSV output:
 * 1. Replace line breaks with literal \n
 * 2. Prefix formula-like values with '
 * 3. Wrap in quotes if cell contains comma, quote, or newline literal
 */
function escapeCsvCell(value: string): string {
  // Replace real line breaks with escaped \n
  const noLineBreaks = value.replace(/\r\n|\n|\r/g, "\\n");

  // Apply formula injection protection (export-only)
  const safe = escapeCsvFormulaForExport(noLineBreaks);

  // RFC 4180: if value contains comma, double-quote, or our \n literal, wrap in quotes
  if (safe.includes(",") || safe.includes('"') || safe.includes("\\n")) {
    // Escape internal double-quotes by doubling them
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

/**
 * Generate a header row from CRM field labels.
 */
function generateHeaderRow(): string {
  return CRM_FIELDS.map((field) => escapeCsvCell(CRM_FIELD_LABELS[field] || "")).join(",");
}

/**
 * Convert a single CrmLeadRecord to a CSV row.
 */
function recordToRow(record: CrmLeadRecord): string {
  return CRM_FIELDS.map((field) => escapeCsvCell(String(record[field] ?? ""))).join(",");
}

/**
 * Generate a full CSV file from an array of CRM records.
 * Includes UTF-8 BOM + header row + data rows.
 */
export function generateCsv(records: CrmLeadRecord[]): string {
  const lines: string[] = [generateHeaderRow()];
  for (const record of records) {
    lines.push(recordToRow(record));
  }
  return UTF8_BOM + lines.join("\r\n");
}

/**
 * Generate CSV as a Blob (for browser download).
 */
export function generateCsvBlob(records: CrmLeadRecord[]): Blob {
  const csv = generateCsv(records);
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

/**
 * Generate a safe filename for the CSV export.
 */
export function generateCsvFilename(baseName?: string): string {
  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safe = (baseName ?? "export")
    .replace(/[^a-zA-Z0-9\-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
  return `${safe}_${now}.csv`;
}
