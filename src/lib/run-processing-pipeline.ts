import Papa from "papaparse";

import {
  clampProgress,
  getStatusForProgress,
  type LoaderStatus,
  type ProgressCallback,
} from "@/lib/import-progress";
import type { ParsedCsv } from "@/lib/types/app";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function emit(onProgress: ProgressCallback, progress: number, status?: LoaderStatus) {
  const clamped = clampProgress(progress);
  onProgress(clamped, status ?? getStatusForProgress(clamped));
}

function parseCsvWithProgress(file: File, onProgress: ProgressCallback): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        rows.push(results.data);
        const cursor = results.meta.cursor ?? 0;
        const ratio = file.size > 0 ? Math.min(1, cursor / file.size) : 1;
        emit(onProgress, 4 + ratio * 20, "Reading CSV");
      },
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV parse warnings:", results.errors);
        }
        emit(onProgress, 24, "Reading CSV");
        resolve({
          fileName: file.name,
          fileSize: file.size,
          headers: results.meta.fields ?? [],
          rows,
        });
      },
      error: (error) => reject(error),
    });
  });
}

async function runBatchStage(
  onProgress: ProgressCallback,
  from: number,
  to: number,
  status: LoaderStatus,
  rowCount: number,
  batchIndex: number
): Promise<void> {
  emit(onProgress, from, status);
  const steps = Math.max(3, Math.min(8, Math.ceil(rowCount / 40)));
  for (let i = 1; i <= steps; i += 1) {
    const pct = from + ((to - from) * i) / steps;
    emit(onProgress, pct, status);
    await wait(120 + batchIndex * 40);
  }
  emit(onProgress, to, status);
}

export async function runProcessingPipeline(
  file: File,
  onProgress: ProgressCallback
): Promise<ParsedCsv> {
  emit(onProgress, 2, "Reading CSV");
  const parsed = await parseCsvWithProgress(file, onProgress);

  emit(onProgress, 25, "Detecting Columns");
  await wait(350 + parsed.headers.length * 20);

  const rowCount = parsed.rows.length;
  await runBatchStage(onProgress, 28, 40, "Sending AI Batch 1", rowCount, 0);
  await runBatchStage(onProgress, 42, 55, "Sending AI Batch 2", rowCount, 1);
  await runBatchStage(onProgress, 58, 70, "Extracting CRM Fields", rowCount, 2);
  await runBatchStage(onProgress, 72, 85, "Validating Records", rowCount, 3);
  await runBatchStage(onProgress, 87, 95, "Finalizing Import", rowCount, 4);

  emit(onProgress, 100, "Completed");
  await wait(700);

  return parsed;
}

export async function runImportPipeline(
  rowCount: number,
  onProgress: ProgressCallback
): Promise<void> {
  emit(onProgress, 5, "Reading CSV");
  await wait(200);
  emit(onProgress, 25, "Detecting Columns");
  await wait(250);
  await runBatchStage(onProgress, 28, 40, "Sending AI Batch 1", rowCount, 0);
  await runBatchStage(onProgress, 42, 55, "Sending AI Batch 2", rowCount, 1);
  await runBatchStage(onProgress, 58, 70, "Extracting CRM Fields", rowCount, 2);
  await runBatchStage(onProgress, 72, 85, "Validating Records", rowCount, 3);
  await runBatchStage(onProgress, 87, 95, "Finalizing Import", rowCount, 4);
  emit(onProgress, 100, "Completed");
  await wait(700);
}
