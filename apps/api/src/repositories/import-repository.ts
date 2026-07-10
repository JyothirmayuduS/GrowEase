import { getServiceClient } from "../config/supabase";
import { AppError, ErrorCodes, NotFoundError } from "../utils/errors";
import type { ImportStatus, SourceType } from "../types/domain";

export interface ImportJobRow {
  id: string;
  user_id: string;
  source_type: SourceType;
  filename: string | null;
  original_filename: string | null;
  file_size: number | null;
  total_rows: number;
  processed_rows: number;
  imported_rows: number;
  skipped_rows: number;
  failed_rows: number;
  average_confidence: number | null;
  current_step: string | null;
  progress: number;
  status: ImportStatus;
  processing_time_ms: number | null;
  error_message: string | null;
  source_metadata: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function db() {
  return getServiceClient();
}

export async function createImportJob(input: {
  userId: string;
  sourceType: SourceType;
  filename: string;
  originalFilename: string;
  fileSize: number;
  totalRows: number;
  sourceMetadata?: Record<string, unknown>;
  status?: ImportStatus;
}): Promise<ImportJobRow> {
  const { data, error } = await db()
    .from("import_jobs")
    .insert({
      user_id: input.userId,
      source_type: input.sourceType,
      filename: input.filename,
      original_filename: input.originalFilename,
      file_size: input.fileSize,
      total_rows: input.totalRows,
      status: input.status ?? "uploaded",
      current_step: "uploaded",
      progress: 5,
      source_metadata: input.sourceMetadata ?? {},
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create import job", 500);
  }
  return data as ImportJobRow;
}

export async function getImportJob(jobId: string, userId: string): Promise<ImportJobRow> {
  const { data, error } = await db()
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to load import job", 500);
  if (!data) throw new NotFoundError("Import job not found", ErrorCodes.IMPORT_NOT_FOUND);
  return data as ImportJobRow;
}

export async function listImportJobs(userId: string, limit = 50): Promise<ImportJobRow[]> {
  const { data, error } = await db()
    .from("import_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to list imports", 500);
  return (data ?? []) as ImportJobRow[];
}

export async function updateImportJob(
  jobId: string,
  patch: Partial<{
    status: ImportStatus;
    current_step: string;
    progress: number;
    processed_rows: number;
    imported_rows: number;
    skipped_rows: number;
    failed_rows: number;
    average_confidence: number;
    processing_time_ms: number;
    error_message: string | null;
    completed_at: string | null;
    source_metadata: Record<string, unknown>;
    total_rows: number;
  }>
): Promise<void> {
  const { error } = await db().from("import_jobs").update(patch).eq("id", jobId);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update import job", 500);
}

export async function deleteImportJob(jobId: string, userId: string): Promise<void> {
  const { error } = await db().from("import_jobs").delete().eq("id", jobId).eq("user_id", userId);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete import job", 500);
}

export async function insertFieldMappings(
  rows: Array<{
    user_id: string;
    import_job_id: string;
    source_column: string;
    target_field: string;
    confidence: number;
    status: string;
    ai_reason: string;
  }>
): Promise<void> {
  if (!rows.length) return;
  await db().from("field_mappings").delete().eq("import_job_id", rows[0]!.import_job_id);
  const { error } = await db().from("field_mappings").insert(rows);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to save mappings", 500);
}

export async function listFieldMappings(jobId: string, userId: string) {
  const { data, error } = await db()
    .from("field_mappings")
    .select("*")
    .eq("import_job_id", jobId)
    .eq("user_id", userId);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to load mappings", 500);
  return data ?? [];
}

export async function upsertBatch(input: {
  importJobId: string;
  batchNumber: number;
  idempotencyKey: string;
  status: string;
  attemptCount: number;
  inputRows: number;
  outputRows?: number;
  errorMessage?: string | null;
  startedAt?: string;
  completedAt?: string | null;
}) {
  const { data: existing } = await db()
    .from("import_batches")
    .select("*")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing?.status === "completed") return existing;

  if (existing) {
    const { data, error } = await db()
      .from("import_batches")
      .update({
        status: input.status,
        attempt_count: input.attemptCount,
        input_rows: input.inputRows,
        output_rows: input.outputRows ?? existing.output_rows,
        error_message: input.errorMessage ?? null,
        started_at: input.startedAt ?? existing.started_at,
        completed_at: input.completedAt ?? null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update batch", 500);
    return data;
  }

  const { data, error } = await db()
    .from("import_batches")
    .insert({
      import_job_id: input.importJobId,
      batch_number: input.batchNumber,
      idempotency_key: input.idempotencyKey,
      status: input.status,
      attempt_count: input.attemptCount,
      input_rows: input.inputRows,
      output_rows: input.outputRows ?? 0,
      error_message: input.errorMessage ?? null,
      started_at: input.startedAt ?? new Date().toISOString(),
      completed_at: input.completedAt ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create batch", 500);
  return data;
}

export async function insertLeads(
  userId: string,
  jobId: string,
  leads: Array<Record<string, unknown>>
): Promise<number> {
  if (!leads.length) return 0;
  const rows = leads.map((l) => ({
    user_id: userId,
    import_job_id: jobId,
    created_at_source: l.created_at || null,
    name: l.name || null,
    email: l.email || null,
    country_code: l.country_code || null,
    mobile_without_country_code: l.mobile_without_country_code || null,
    company: l.company || null,
    city: l.city || null,
    state: l.state || null,
    country: l.country || null,
    lead_owner: l.lead_owner || null,
    crm_status: l.crm_status || null,
    crm_note: l.crm_note || null,
    data_source: l.data_source || null,
    possession_time: l.possession_time || null,
    description: l.description || null,
    confidence: l.confidence ?? null,
    original_record: l.original_record ?? {},
  }));
  const { error } = await db().from("crm_leads").insert(rows);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to insert leads", 500);
  return rows.length;
}

export async function insertSkipped(
  userId: string,
  jobId: string,
  skipped: Array<{
    row_number?: number;
    original_record: Record<string, string>;
    skip_reason?: string;
    validation_errors?: string[];
  }>
): Promise<number> {
  if (!skipped.length) return 0;
  const rows = skipped.map((s) => ({
    user_id: userId,
    import_job_id: jobId,
    row_number: s.row_number ?? null,
    original_record: s.original_record,
    skip_reason: s.skip_reason ?? null,
    validation_errors: s.validation_errors ?? [],
  }));
  const { error } = await db().from("skipped_records").insert(rows);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to insert skipped records", 500);
  return rows.length;
}

export async function listLeadsForJob(jobId: string, userId: string) {
  const { data, error } = await db()
    .from("crm_leads")
    .select("*")
    .eq("import_job_id", jobId)
    .eq("user_id", userId);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to load leads", 500);
  return data ?? [];
}

export async function listSkippedForJob(jobId: string, userId: string) {
  const { data, error } = await db()
    .from("skipped_records")
    .select("*")
    .eq("import_job_id", jobId)
    .eq("user_id", userId);
  if (error) throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to load skipped", 500);
  return data ?? [];
}

export async function writeAudit(input: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}) {
  await db().from("audit_logs").insert({
    user_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    request_id: input.requestId ?? null,
  });
}
