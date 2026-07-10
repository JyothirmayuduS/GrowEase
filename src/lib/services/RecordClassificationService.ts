/**
 * RecordClassificationService
 *
 * Combines all validation results to assign IMPORTED / NEEDS_REVIEW / SKIPPED
 * and compute a confidence score.
 *
 * Rules:
 * - SKIPPED: no valid email AND no valid phone
 * - NEEDS_REVIEW: has valid contact info but has warnings/issues
 * - IMPORTED: has valid contact info and no critical issues
 */

import type { CrmLeadRecord } from "@/lib/types/crm";

export type RecordStatus = "IMPORTED" | "NEEDS_REVIEW" | "SKIPPED";

export interface ProcessingWarning {
  code: string;
  field: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface ClassifiedRecord {
  sourceRowNumber: number;
  recordStatus: RecordStatus;
  record: CrmLeadRecord;
  warnings: ProcessingWarning[];
  skipReason: string | null;
  confidence: number;
  originalRecord: Record<string, string>;
}

/** Checks whether a record has at least one valid contact point. */
export function hasValidContact(record: CrmLeadRecord): boolean {
  return Boolean(record.email.trim() || record.mobile_without_country_code.trim());
}

/** Calculate a confidence score based on field completeness and warning severity. */
export function calculateConfidence(
  record: CrmLeadRecord,
  warnings: ProcessingWarning[]
): number {
  let score = 100;

  // Presence scoring
  if (!record.email.trim()) score -= 10;
  if (!record.mobile_without_country_code.trim()) score -= 8;
  if (!record.name.trim()) score -= 12;
  if (!record.country_code.trim()) score -= 5;
  if (!record.company.trim()) score -= 3;
  if (!record.city.trim()) score -= 2;
  if (!record.crm_status.trim()) score -= 3;

  // Warning penalty
  for (const w of warnings) {
    if (w.severity === "error") score -= 15;
    else if (w.severity === "warning") score -= 8;
    else score -= 2;
  }

  return Math.max(10, Math.min(100, Math.round(score))) / 100;
}

/** Classify a record into IMPORTED / NEEDS_REVIEW / SKIPPED. */
export function classifyRecord(
  sourceRowNumber: number,
  record: CrmLeadRecord,
  warnings: ProcessingWarning[],
  originalRecord: Record<string, string>,
  skipReason?: string
): ClassifiedRecord {
  // Explicit skip (e.g., duplicate)
  if (skipReason) {
    return {
      sourceRowNumber,
      recordStatus: "SKIPPED",
      record,
      warnings,
      skipReason,
      confidence: 0,
      originalRecord,
    };
  }

  // No contact info → skip
  if (!hasValidContact(record)) {
    return {
      sourceRowNumber,
      recordStatus: "SKIPPED",
      record,
      warnings,
      skipReason: "Record has neither email nor mobile number",
      confidence: 0,
      originalRecord,
    };
  }

  const confidence = calculateConfidence(record, warnings);

  // Has contact info + has errors/warnings → needs review
  const hasIssues = warnings.some(
    (w) => w.severity === "error" || w.severity === "warning"
  );

  const recordStatus: RecordStatus = hasIssues ? "NEEDS_REVIEW" : "IMPORTED";

  return {
    sourceRowNumber,
    recordStatus,
    record,
    warnings,
    skipReason: null,
    confidence,
    originalRecord,
  };
}
