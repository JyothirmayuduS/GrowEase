import { parseCsvBuffer } from "@/lib/csv/parse-csv-buffer";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  // Extension is authoritative — MIME is unreliable across browsers/OS.
  return name.endsWith(".csv");
}

/**
 * POST /api/parse
 * Multipart form field: `file` (CSV)
 * Returns raw parsed rows (no AI mapping).
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart form data with a file field named \"file\".", 400);
  }

  const entry = form.get("file");
  if (!entry || !(entry instanceof File)) {
    return jsonError("Missing file. Upload a CSV using the form field \"file\".", 400);
  }

  const file = entry;

  if (!file.name || file.name.trim() === "") {
    return jsonError("Uploaded file has no name.", 400);
  }

  if (!isCsvFile(file)) {
    return jsonError("File type must be .csv. Other formats are not supported.", 400);
  }

  if (file.size === 0) {
    return jsonError("File is empty. Upload a CSV that includes a header row and at least one data row.", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum size is 5 MB.`,
      400
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseCsvBuffer(buffer, file.name, file.size);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse CSV";
    return jsonError(message, 400);
  }

  if (parsed.headers.length === 0) {
    return jsonError("CSV has no header columns. Add a header row and try again.", 400);
  }

  if (parsed.rows.length === 0) {
    return jsonError(
      "CSV has a header but no data rows. Add at least one lead row and try again.",
      400
    );
  }

  return Response.json({
    fileName: parsed.fileName,
    fileSize: parsed.fileSize,
    headers: parsed.headers,
    rows: parsed.rows,
    rowCount: parsed.rowCount,
    columnCount: parsed.columnCount,
  });
}
