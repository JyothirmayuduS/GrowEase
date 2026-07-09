import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { callAiJson } from "@/lib/ai/ai-provider";
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

export async function extractBatch(
  headers: string[],
  rows: Record<string, string>[],
  rowOffset: number,
  maxRetries = 3
): Promise<{ imported: CrmLeadRecord[]; skipped: SkippedRecord[] }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const content = await callAiJson(buildSystemPrompt(), buildUserPrompt(headers, rows));
      const parsed = parseAiJson(content);
      const records = parsed.records ?? [];

      const imported: CrmLeadRecord[] = [];
      const skipped: SkippedRecord[] = [];

      rows.forEach((rawRow, index) => {
        const aiRecord = records[index] ?? {};
        const sanitized = sanitizeCrmRecord(aiRecord);
        const rowIndex = rowOffset + index;

        if (aiRecord.skip === true) {
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
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await wait(500 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError ?? new Error("Batch extraction failed");
}
