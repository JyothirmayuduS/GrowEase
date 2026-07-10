/** Client-side upload guards (server still re-validates). */

export const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5MB

export function isCsvFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".csv");
}

export function validateCsvFileClient(file: File): string | null {
  if (!(file instanceof File)) return "No file selected.";
  if (!isCsvFileName(file.name)) return "Only .csv files are accepted.";
  if (file.size === 0) return "File is empty. Choose a CSV with a header and data rows.";
  if (file.size > MAX_CSV_BYTES) {
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum size is 5 MB.`;
  }
  return null;
}

export interface ParseApiResponse {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  columnCount: number;
}

/** Upload CSV to POST /api/parse (server-side Papa Parse + validation). */
export async function parseCsvViaApi(file: File): Promise<ParseApiResponse> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/parse", {
    method: "POST",
    body: form,
  });

  const raw = await response.text();
  let body: { error?: string } & Partial<ParseApiResponse> = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    // non-JSON error page
  }

  if (!response.ok) {
    throw new Error(body.error || `Parse failed (${response.status})`);
  }

  if (!body.headers || !body.rows) {
    throw new Error("Parse response was missing headers or rows.");
  }

  return {
    fileName: body.fileName ?? file.name,
    fileSize: body.fileSize ?? file.size,
    headers: body.headers,
    rows: body.rows,
    rowCount: body.rowCount ?? body.rows.length,
    columnCount: body.columnCount ?? body.headers.length,
  };
}
