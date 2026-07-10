import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/ai/prompts";
import { callAiJson, getAiProviderName } from "@/lib/ai/ai-provider";
import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";
import { normalizeAiBatchRecords } from "@/lib/validation/crm-record";
import { hybridProcessRecord } from "@/lib/services/HybridRowProcessor";
import { DuplicateDetectionService } from "@/lib/services/DuplicateDetectionService";
import {
  classifyRecord,
} from "@/lib/services/RecordClassificationService";
import type { CrmLeadRecord, SkippedRecord } from "@/lib/types/crm";

// Module-level duplicate tracker — reset per import job in extractBatchSession
const defaultDuplicateTracker = new DuplicateDetectionService();

interface AiBatchRecord extends Partial<CrmLeadRecord> {
  skip?: boolean;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAiJson(content: string): { records: unknown } {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response did not contain JSON");
  return JSON.parse(jsonMatch[0]) as { records: unknown };
}

/**
 * Apply the hybrid deterministic pipeline to AI/heuristic-extracted records.
 * Replaces the old sanitizeCrmRecord approach with full validation.
 */
function processRecords(
  rows: Record<string, string>[],
  records: Partial<CrmLeadRecord>[],
  rowOffset: number,
  duplicateTracker: DuplicateDetectionService,
  allowAiSkip = true
): { imported: CrmLeadRecord[]; skipped: SkippedRecord[] } {
  const imported: CrmLeadRecord[] = [];
  const skipped: SkippedRecord[] = [];

  rows.forEach((rawRow, index) => {
    const aiRecord = records[index] ?? {};
    const rowNumber = rowOffset + index + 1; // 1-based

    // AI explicitly marked as skip — verify first
    const aiWantsSkip = allowAiSkip && (aiRecord as AiBatchRecord).skip === true;

    // Run hybrid deterministic pipeline
    const { record, warnings } = hybridProcessRecord(aiRecord, rawRow);

    // Duplicate detection (after we have final email + phone)
    const dupCheck = duplicateTracker.check(
      record.email,
      record.country_code,
      record.mobile_without_country_code,
      rowNumber
    );

    let skipReason: string | undefined;
    if (dupCheck.status === "DUPLICATE_IN_FILE") {
      skipReason = dupCheck.reason ?? "Duplicate row";
    } else if (aiWantsSkip && !record.email && !record.mobile_without_country_code) {
      skipReason = "AI marked as skip (no email or mobile)";
    }

    const classified = classifyRecord(
      rowNumber,
      record,
      warnings,
      rawRow,
      skipReason
    );

    if (classified.recordStatus === "SKIPPED") {
      skipped.push({
        rowIndex: rowOffset + index,
        reason: classified.skipReason ?? "No valid contact information",
        raw: rawRow,
      });
    } else {
      classified.record.confidence = classified.confidence;
      classified.record.original_record = rawRow;
      imported.push(classified.record);
    }
  });

  return { imported, skipped };
}

async function callWithSchemaValidation(
  headers: string[],
  rows: Record<string, string>[]
): Promise<Partial<CrmLeadRecord>[]> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(headers, rows);

  let content = await callAiJson(system, user);
  try {
    const parsed = parseAiJson(content);
    return normalizeAiBatchRecords(parsed.records, rows.length);
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : String(firstError);
    content = await callAiJson(system, `${user}\n\n${buildRepairPrompt(message, rows.length)}`);
    const repaired = parseAiJson(content);
    return normalizeAiBatchRecords(repaired.records, rows.length);
  }
}

export async function extractBatch(
  headers: string[],
  rows: Record<string, string>[],
  rowOffset: number,
  maxRetries = 3,
  duplicateTracker: DuplicateDetectionService = defaultDuplicateTracker
): Promise<{ imported: CrmLeadRecord[]; skipped: SkippedRecord[] }> {
  if (getAiProviderName() === "heuristic") {
    return processRecords(
      rows,
      heuristicExtractBatch(headers, rows),
      rowOffset,
      duplicateTracker,
      false
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const records = await callWithSchemaValidation(headers, rows);
      return processRecords(rows, records as AiBatchRecord[], rowOffset, duplicateTracker);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message;
      const shouldFallback =
        /quota|rate.?limit|billing|401|403|429|invalid|not configured/i.test(message);
      if (shouldFallback) {
        break;
      }
      if (attempt < maxRetries) {
        await wait(500 * 2 ** (attempt - 1));
      }
    }
  }

  // API unavailable — fall back to deterministic column mapping
  console.warn("AI unavailable, falling back to heuristic extraction:", lastError?.message);
  return processRecords(
    rows,
    heuristicExtractBatch(headers, rows),
    rowOffset,
    duplicateTracker,
    false
  );
}
