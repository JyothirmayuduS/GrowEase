/**
 * RecordValidationService
 *
 * Wraps the full 13-step validation pipeline into a single callable function.
 * This is the canonical entry point for validating a CRM record.
 *
 * Processing order (per spec):
 * 1. Preserve original row
 * 2. Extract emails from all cells
 * 3. Extract phones from all cells
 * 4. Normalize date
 * 5. Map CRM fields
 * 6. Normalize crm_status
 * 7. Normalize data_source
 * 8. Build crm_note
 * 9. Validate final record
 * 10. Classify row
 * 11-13. Handled by caller (store, export)
 */

import type { CrmLeadRecord } from "@/lib/types/crm";
import { hybridProcessRecord } from "@/lib/services/HybridRowProcessor";
import {
  classifyRecord,
  type ClassifiedRecord,
  type ProcessingWarning,
} from "@/lib/services/RecordClassificationService";

export interface ValidationPipelineResult {
  classifiedRecord: ClassifiedRecord;
  warnings: ProcessingWarning[];
}

/**
 * Run the full validation pipeline for a single row.
 *
 * @param aiRecord - AI/heuristic extracted partial record (may be empty {})
 * @param rawRow - original unmodified CSV row for row-wide scanning
 * @param sourceRowNumber - 1-based row index for error reporting
 * @param skipReason - optional forced skip (e.g., duplicate)
 */
export function validateRecord(
  aiRecord: Partial<CrmLeadRecord>,
  rawRow: Record<string, string>,
  sourceRowNumber: number,
  skipReason?: string
): ValidationPipelineResult {
  // Steps 2–8 handled inside hybridProcessRecord
  const { record, warnings } = hybridProcessRecord(aiRecord, rawRow);

  // Step 10: Classify
  const classifiedRecord = classifyRecord(
    sourceRowNumber,
    record,
    warnings,
    rawRow,
    skipReason
  );

  return { classifiedRecord, warnings };
}
