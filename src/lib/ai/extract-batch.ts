import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/ai/prompts";
import { callAiJson, getAiProviderName } from "@/lib/ai/ai-provider";
import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";
import {
  getSkipReason,
  normalizeAiBatchRecords,
  sanitizeCrmRecord,
} from "@/lib/validation/crm-record";
import type { CrmLeadRecord, SkippedRecord } from "@/lib/types/crm";

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

function processRecords(
  rows: Record<string, string>[],
  records: Partial<CrmLeadRecord>[],
  rowOffset: number,
  allowAiSkip = true
): { imported: CrmLeadRecord[]; skipped: SkippedRecord[] } {
  const imported: CrmLeadRecord[] = [];
  const skipped: SkippedRecord[] = [];

  rows.forEach((rawRow, index) => {
    const aiRecord = records[index] ?? {};
    const sanitized = sanitizeCrmRecord(aiRecord);
    const rowIndex = rowOffset + index;

    if (allowAiSkip && (aiRecord as { skip?: boolean }).skip === true) {
      // Still re-check: if contact exists after sanitize, do not skip
      if (!getSkipReason(sanitized)) {
        imported.push(sanitized);
        return;
      }
      skipped.push({
        rowIndex,
        reason: "AI marked as skip (no email or mobile)",
        raw: rawRow,
      });
      return;
    }

    const skipReason = getSkipReason(sanitized);
    if (skipReason) {
      skipped.push({ rowIndex, reason: skipReason, raw: rawRow });
      return;
    }

    imported.push(sanitized);
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
  maxRetries = 3
): Promise<{ imported: CrmLeadRecord[]; skipped: SkippedRecord[] }> {
  if (getAiProviderName() === "heuristic") {
    return processRecords(rows, heuristicExtractBatch(headers, rows), rowOffset, false);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const records = await callWithSchemaValidation(headers, rows);
      return processRecords(rows, records as AiBatchRecord[], rowOffset);
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

  // API unavailable — fall back to deterministic column mapping (still applies sanitize rules)
  return processRecords(rows, heuristicExtractBatch(headers, rows), rowOffset, false);
}
