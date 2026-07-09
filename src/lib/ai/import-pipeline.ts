import { DEFAULT_BATCH_SIZE, MAX_RETRIES } from "@/lib/constants/crm";
import { extractBatch } from "@/lib/ai/extract-batch";
import type { ImportApiResponse } from "@/lib/types/crm";

export interface ImportProgressUpdate {
  percent: number;
  status: string;
  batch: number;
  totalBatches: number;
}

export async function runServerImportPipeline(
  headers: string[],
  rows: Record<string, string>[],
  onProgress?: (update: ImportProgressUpdate) => void
): Promise<ImportApiResponse> {
  const batchSize = DEFAULT_BATCH_SIZE;
  const totalBatches = Math.max(1, Math.ceil(rows.length / batchSize));

  const imported: ImportApiResponse["imported"] = [];
  const skipped: ImportApiResponse["skipped"] = [];

  const statusForBatch = (batch: number): string => {
    const ratio = batch / totalBatches;
    if (ratio <= 0.25) return "Sending AI Batch 1";
    if (ratio <= 0.5) return "Sending AI Batch 2";
    if (ratio <= 0.7) return "Extracting CRM Fields";
    if (ratio <= 0.85) return "Validating Records";
    return "Finalizing Import";
  };

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    const start = batchIndex * batchSize;
    const batchRows = rows.slice(start, start + batchSize);

    onProgress?.({
      percent: Math.round((batchIndex / totalBatches) * 90) + 5,
      status: statusForBatch(batchIndex + 1),
      batch: batchIndex + 1,
      totalBatches,
    });

    const result = await extractBatch(headers, batchRows, start, MAX_RETRIES);
    imported.push(...result.imported);
    skipped.push(...result.skipped);
  }

  onProgress?.({
    percent: 100,
    status: "Completed",
    batch: totalBatches,
    totalBatches,
  });

  return {
    imported,
    skipped,
    totals: {
      imported: imported.length,
      skipped: skipped.length,
      total: rows.length,
    },
  };
}
