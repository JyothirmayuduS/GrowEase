import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";
import { createAIProvider } from "../ai/factory";
import { assertCsvUpload, parseCsvBuffer } from "../csv/parse-csv";
import { validateExtractedBatch } from "../validation/validate-extracted";
import {
  createImportJob,
  getImportJob,
  insertFieldMappings,
  insertLeads,
  insertSkipped,
  updateImportJob,
  upsertBatch,
  writeAudit,
} from "../../repositories/import-repository";
import type { ImportPipelineInput } from "../../types/domain";
import { ConflictError, ErrorCodes } from "../../utils/errors";

const jobLocks = new Set<string>();

export class ImportPipelineService {
  async preview(input: ImportPipelineInput) {
    assertCsvUpload({
      originalname: input.filename,
      mimetype: "text/csv",
      size: input.fileBuffer.byteLength,
      buffer: input.fileBuffer,
    });
    const parsed = parseCsvBuffer(input.fileBuffer);
    const ai = createAIProvider();
    const mapping = await ai.analyzeColumns({
      headers: parsed.headers,
      sampleRows: parsed.rows.slice(0, 5),
    });

    const job = await createImportJob({
      userId: input.userId,
      sourceType: input.sourceType,
      filename: input.filename,
      originalFilename: input.filename,
      fileSize: input.fileBuffer.byteLength,
      totalRows: parsed.totalRows,
      sourceMetadata: {
        ...(input.sourceMetadata ?? {}),
        headers: parsed.headers,
        preview: true,
      },
      status: "previewed",
    });

    await insertFieldMappings(
      mapping.mappings.map((m) => ({
        user_id: input.userId,
        import_job_id: job.id,
        source_column: m.source_column,
        target_field: m.target_field,
        confidence: m.confidence,
        status: m.status,
        ai_reason: m.ai_reason,
      }))
    );

    await updateImportJob(job.id, {
      status: "previewed",
      current_step: "previewed",
      progress: 15,
    });

    return {
      jobId: job.id,
      headers: parsed.headers,
      totalRows: parsed.totalRows,
      sampleRows: parsed.rows.slice(0, 10),
      mappings: mapping.mappings,
    };
  }

  async run(input: ImportPipelineInput) {
    assertCsvUpload({
      originalname: input.filename,
      mimetype: "text/csv",
      size: input.fileBuffer.byteLength,
      buffer: input.fileBuffer,
    });

    const started = Date.now();
    const parsed = parseCsvBuffer(input.fileBuffer);
    const job = await createImportJob({
      userId: input.userId,
      sourceType: input.sourceType,
      filename: input.filename,
      originalFilename: input.filename,
      fileSize: input.fileBuffer.byteLength,
      totalRows: parsed.totalRows,
      sourceMetadata: {
        ...(input.sourceMetadata ?? {}),
        headers: parsed.headers,
      },
      status: "processing",
    });

    if (jobLocks.has(job.id)) {
      throw new ConflictError("Import already running", ErrorCodes.IMPORT_ALREADY_RUNNING);
    }
    jobLocks.add(job.id);

    try {
      await this.processJob(job.id, input.userId, parsed.headers, parsed.rows, started);
      return getImportJob(job.id, input.userId);
    } finally {
      jobLocks.delete(job.id);
    }
  }

  async continueJob(jobId: string, userId: string, fileBuffer: Buffer) {
    const job = await getImportJob(jobId, userId);
    if (["processing", "mapping", "validating", "importing"].includes(job.status)) {
      throw new ConflictError("Import already running", ErrorCodes.IMPORT_ALREADY_RUNNING);
    }
    if (jobLocks.has(jobId)) {
      throw new ConflictError("Import already running", ErrorCodes.IMPORT_ALREADY_RUNNING);
    }
    jobLocks.add(jobId);
    try {
      const parsed = parseCsvBuffer(fileBuffer);
      await updateImportJob(jobId, {
        status: "processing",
        current_step: "processing",
        progress: 10,
        total_rows: parsed.totalRows,
        error_message: null,
      });
      await this.processJob(jobId, userId, parsed.headers, parsed.rows, Date.now());
      return getImportJob(jobId, userId);
    } finally {
      jobLocks.delete(jobId);
    }
  }

  private async processJob(
    jobId: string,
    userId: string,
    headers: string[],
    rows: Record<string, string>[],
    started: number
  ) {
    const env = getEnv();
    const ai = createAIProvider();
    const batchSize = env.AI_BATCH_SIZE;
    const maxRetries = env.AI_MAX_RETRIES;

    await updateImportJob(jobId, {
      status: "mapping",
      current_step: "mapping",
      progress: 20,
    });

    const mapping = await ai.analyzeColumns({
      headers,
      sampleRows: rows.slice(0, 5),
    });
    await insertFieldMappings(
      mapping.mappings.map((m) => ({
        user_id: userId,
        import_job_id: jobId,
        source_column: m.source_column,
        target_field: m.target_field,
        confidence: m.confidence,
        status: m.status,
        ai_reason: m.ai_reason,
      }))
    );

    await updateImportJob(jobId, {
      status: "importing",
      current_step: "importing",
      progress: 30,
    });

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const seenRows = new Set<string>();
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    let processed = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    let batchFailures = 0;

    const totalBatches = Math.ceil(rows.length / batchSize) || 1;

    for (let b = 0; b < totalBatches; b++) {
      const live = await getImportJob(jobId, userId);
      if (live.status === "cancelled") {
        throw new ConflictError("Import cancelled", ErrorCodes.IMPORT_CANCELLED);
      }

      const slice = rows.slice(b * batchSize, (b + 1) * batchSize);
      const idempotencyKey = `${jobId}:${b + 1}`;
      const existing = await upsertBatch({
        importJobId: jobId,
        batchNumber: b + 1,
        idempotencyKey,
        status: "processing",
        attemptCount: 1,
        inputRows: slice.length,
        startedAt: new Date().toISOString(),
      });
      if (existing?.status === "completed") {
        processed += slice.length;
        continue;
      }

      let attempt = 0;
      let batchOk = false;
      while (attempt < maxRetries && !batchOk) {
        attempt += 1;
        try {
          await upsertBatch({
            importJobId: jobId,
            batchNumber: b + 1,
            idempotencyKey,
            status: "processing",
            attemptCount: attempt,
            inputRows: slice.length,
          });

          const extracted = await ai.extractRecords({
            headers,
            rows: slice,
            mappings: mapping.mappings,
            startRowNumber: b * batchSize + 1,
          });

          await updateImportJob(jobId, {
            status: "validating",
            current_step: "validating",
          });

          const validated = validateExtractedBatch(
            extracted.records,
            seenEmails,
            seenPhones,
            seenRows
          );

          const inserted = await insertLeads(
            userId,
            jobId,
            validated.leads as unknown as Array<Record<string, unknown>>
          );
          const skippedN = await insertSkipped(userId, jobId, validated.skipped);

          imported += inserted;
          skipped += skippedN;
          processed += slice.length;
          for (const l of validated.leads) {
            confidenceSum += l.confidence;
            confidenceCount += 1;
          }

          await upsertBatch({
            importJobId: jobId,
            batchNumber: b + 1,
            idempotencyKey,
            status: "completed",
            attemptCount: attempt,
            inputRows: slice.length,
            outputRows: inserted,
            completedAt: new Date().toISOString(),
          });
          batchOk = true;
        } catch (err) {
          logger.warn({ jobId, batch: b + 1, attempt }, "batch_failed");
          if (attempt >= maxRetries) {
            failed += slice.length;
            batchFailures += 1;
            await upsertBatch({
              importJobId: jobId,
              batchNumber: b + 1,
              idempotencyKey,
              status: "failed",
              attemptCount: attempt,
              inputRows: slice.length,
              errorMessage: err instanceof Error ? err.message : "batch failed",
              completedAt: new Date().toISOString(),
            });
          } else {
            await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
          }
        }
      }

      const progress = Math.min(
        95,
        30 + Math.round(((b + 1) / totalBatches) * 65)
      );
      await updateImportJob(jobId, {
        status: "importing",
        current_step: "importing",
        progress,
        processed_rows: processed,
        imported_rows: imported,
        skipped_rows: skipped,
        failed_rows: failed,
        average_confidence:
          confidenceCount > 0 ? Number((confidenceSum / confidenceCount).toFixed(2)) : 0,
      });
    }

    const status =
      batchFailures === 0
        ? "completed"
        : imported > 0
          ? "partially_completed"
          : "failed";

    await updateImportJob(jobId, {
      status,
      current_step: status,
      progress: 100,
      processed_rows: processed,
      imported_rows: imported,
      skipped_rows: skipped,
      failed_rows: failed,
      average_confidence:
        confidenceCount > 0 ? Number((confidenceSum / confidenceCount).toFixed(2)) : 0,
      processing_time_ms: Date.now() - started,
      completed_at: new Date().toISOString(),
      error_message:
        status === "failed"
          ? "All batches failed"
          : status === "partially_completed"
            ? "Some batches failed"
            : null,
    });

    await writeAudit({
      userId,
      action: "import.completed",
      entityType: "import_job",
      entityId: jobId,
      metadata: { status, imported, skipped, failed },
    });
  }

  async cancel(jobId: string, userId: string) {
    const job = await getImportJob(jobId, userId);
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      return job;
    }
    await updateImportJob(jobId, {
      status: "cancelled",
      current_step: "cancelled",
      completed_at: new Date().toISOString(),
      error_message: "Cancelled by user",
    });
    return getImportJob(jobId, userId);
  }
}

export const importPipeline = new ImportPipelineService();
