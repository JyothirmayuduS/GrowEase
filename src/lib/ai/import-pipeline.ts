import { DEFAULT_BATCH_SIZE, MAX_RETRIES } from "@/lib/constants/crm";
import { getStatusForProgress } from "@/lib/import-progress";
import { extractBatch } from "@/lib/ai/extract-batch";
import { DuplicateDetectionService } from "@/lib/services/DuplicateDetectionService";
import type { ImportApiResponse } from "@/lib/types/crm";
import { storeImportResultInSupabase } from "@/lib/supabase";

export interface ImportProgressUpdate {
  percent: number;
  status: string;
  batch: number;
  totalBatches: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runServerImportPipeline(
  headers: string[],
  rows: Record<string, string>[],
  filename?: string,
  onProgress?: (update: ImportProgressUpdate) => void
): Promise<ImportApiResponse> {
  const batchSize = DEFAULT_BATCH_SIZE;
  const totalBatches = Math.max(1, Math.ceil(rows.length / batchSize));

  const imported: ImportApiResponse["imported"] = [];
  const skipped: ImportApiResponse["skipped"] = [];

  // Shared duplicate tracker across all batches — ensures cross-batch deduplication
  const duplicateTracker = new DuplicateDetectionService();

  const emit = (percent: number, batch: number) => {
    onProgress?.({
      percent: Math.round(percent),
      status: getStatusForProgress(percent),
      batch,
      totalBatches,
    });
  };

  emit(5, 0);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    const start = batchIndex * batchSize;
    const batchRows = rows.slice(start, start + batchSize);
    const batchStart = 8 + (batchIndex / totalBatches) * 82;
    const batchEnd = 8 + ((batchIndex + 1) / totalBatches) * 82;

    emit(batchStart, batchIndex + 1);

    let tick = batchStart;
    const ticker = setInterval(() => {
      tick = Math.min(tick + 0.4, batchEnd - 2);
      emit(tick, batchIndex + 1);
    }, 900);

    try {
      const result = await extractBatch(
        headers,
        batchRows,
        start,
        MAX_RETRIES,
        duplicateTracker
      );
      imported.push(...result.imported);
      skipped.push(...result.skipped);
    } finally {
      clearInterval(ticker);
    }

    emit(batchEnd, batchIndex + 1);
    if (totalBatches < 50) {
      await wait(400);
    }
  }

  emit(98, totalBatches);
  await wait(500);
  emit(100, totalBatches);

  // Store in Supabase database
  try {
    await storeImportResultInSupabase(filename || "imported_leads.csv", imported, skipped);
  } catch (dbError) {
    console.error("Supabase storage error:", dbError);
  }

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
