import type { Request, Response, NextFunction } from "express";
import multer from "multer";

import { importPipeline } from "../services/import/import-pipeline";
import {
  deleteImportJob,
  getImportJob,
  listFieldMappings,
  listImportJobs,
  listLeadsForJob,
  listSkippedForJob,
  updateImportJob,
  writeAudit,
} from "../repositories/import-repository";
import { csvSafeCell } from "../services/validation/normalize";
import { AuthenticationError, ValidationError } from "../utils/errors";
import { getServiceClient } from "../config/supabase";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024) },
});

export const uploadCsv = upload.single("file");

function requireUser(req: Request): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export async function previewImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const file = req.file;
    if (!file) throw new ValidationError("CSV file is required");
    const result = await importPipeline.preview({
      userId,
      sourceType: "manual_upload",
      filename: file.originalname,
      fileBuffer: file.buffer,
    });
    await writeAudit({
      userId,
      action: "import.preview",
      entityType: "import_job",
      entityId: result.jobId,
      requestId: req.requestId,
    });
    res.json({ success: true, data: result, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function createImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const file = req.file;
    if (!file) throw new ValidationError("CSV file is required");
    const job = await importPipeline.run({
      userId,
      sourceType: "manual_upload",
      filename: file.originalname,
      fileBuffer: file.buffer,
    });
    res.status(201).json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function listImports(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const jobs = await listImportJobs(userId);
    res.json({ success: true, data: jobs, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function getImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    res.json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function getImportProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        processedRows: job.processed_rows,
        importedRows: job.imported_rows,
        skippedRows: job.skipped_rows,
        failedRows: job.failed_rows,
        averageConfidence: job.average_confidence,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await importPipeline.cancel(String(req.params.jobId), userId);
    res.json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function retryImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const file = req.file;
    if (!file) throw new ValidationError("Re-upload the CSV file to retry");
    const job = await importPipeline.continueJob(
      String(req.params.jobId),
      userId,
      file.buffer
    );
    res.json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function removeImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    await deleteImportJob(String(req.params.jobId), userId);
    res.json({ success: true, data: { deleted: true }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function getMappings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    await getImportJob(String(req.params.jobId), userId);
    const mappings = await listFieldMappings(String(req.params.jobId), userId);
    res.json({ success: true, data: mappings, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function patchMappings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const jobId = String(req.params.jobId);
    await getImportJob(jobId, userId);
    const updates = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
    for (const m of updates) {
      if (!m.id) continue;
      await getServiceClient()
        .from("field_mappings")
        .update({
          target_field: m.target_field,
          user_overridden: true,
          status: m.target_field ? "mapped" : "unmapped",
          updated_at: new Date().toISOString(),
        })
        .eq("id", m.id)
        .eq("user_id", userId)
        .eq("import_job_id", jobId);
    }
    const mappings = await listFieldMappings(jobId, userId);
    res.json({ success: true, data: mappings, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function confirmMappings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    await updateImportJob(job.id, {
      status: "previewed",
      current_step: "mappings_confirmed",
      progress: Math.max(job.progress, 20),
    });
    res.json({
      success: true,
      data: { jobId: job.id, message: "Mappings confirmed. Upload file again via continue to import." },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function getValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    const skipped = await listSkippedForJob(job.id, userId);
    res.json({
      success: true,
      data: {
        importedRows: job.imported_rows,
        skippedRows: job.skipped_rows,
        failedRows: job.failed_rows,
        skippedSample: skipped.slice(0, 50),
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function continueImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const file = req.file;
    if (!file) throw new ValidationError("CSV file is required to continue");
    const job = await importPipeline.continueJob(
      String(req.params.jobId),
      userId,
      file.buffer
    );
    res.json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function downloadCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    const leads = await listLeadsForJob(job.id, userId);
    const headers = [
      "created_at_source",
      "name",
      "email",
      "country_code",
      "mobile_without_country_code",
      "company",
      "city",
      "state",
      "country",
      "lead_owner",
      "crm_status",
      "crm_note",
      "data_source",
      "possession_time",
      "description",
      "confidence",
    ];
    const lines = [headers.join(",")];
    for (const lead of leads) {
      const row = headers.map((h) => {
        const raw = String((lead as Record<string, unknown>)[h] ?? "");
        const safe = csvSafeCell(raw).replace(/"/g, '""');
        return `"${safe}"`;
      });
      lines.push(row.join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="import-${job.id}.csv"`
    );
    res.send(lines.join("\n"));
  } catch (err) {
    next(err);
  }
}

export async function downloadJson(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    const leads = await listLeadsForJob(job.id, userId);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="import-${job.id}.json"`
    );
    res.json({ job, leads });
  } catch (err) {
    next(err);
  }
}

export async function downloadSkipped(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const job = await getImportJob(String(req.params.jobId), userId);
    const skipped = await listSkippedForJob(job.id, userId);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="skipped-${job.id}.json"`
    );
    res.json({ jobId: job.id, skipped });
  } catch (err) {
    next(err);
  }
}
