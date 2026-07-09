import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { callAiJson, getAiProviderName } from "@/lib/ai/ai-provider";
import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";
import { getSkipReason, sanitizeCrmRecord } from "@/lib/validation/crm-record";
import type { CrmLeadRecord, SkippedRecord } from "@/lib/types/crm";

interface AiBatchRecord extends Partial<CrmLeadRecord> {
  skip?: boolean;
}

interface AiBatchResponse {
  records: AiBatchRecord[];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAiJson(content: string): AiBatchResponse {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response did not contain JSON");
  return JSON.parse(jsonMatch[0]) as AiBatchResponse;
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
      const content = await callAiJson(buildSystemPrompt(), buildUserPrompt(headers, rows));
      const parsed = parseAiJson(content);
      return processRecords(rows, parsed.records ?? [], rowOffset);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await wait(500 * 2 ** (attempt - 1));
      }
    }
  }

  // API unavailable (quota, invalid key, etc.) — fall back to column mapping
  return processRecords(rows, heuristicExtractBatch(headers, rows), rowOffset, false);
}
