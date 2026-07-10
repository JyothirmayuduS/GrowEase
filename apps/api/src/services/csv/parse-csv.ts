import { parse } from "csv-parse/sync";

import { getEnv } from "../../config/env";
import { ErrorCodes, ValidationError } from "../../utils/errors";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

const CSV_MIME = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);

export function assertCsvUpload(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): void {
  const env = getEnv();
  if (file.size > env.MAX_UPLOAD_BYTES) {
    throw new ValidationError("File exceeds maximum size", [], ErrorCodes.FILE_TOO_LARGE);
  }
  const name = file.originalname.toLowerCase();
  if (!name.endsWith(".csv")) {
    throw new ValidationError("Only .csv files are supported", [], ErrorCodes.UNSUPPORTED_FILE_TYPE);
  }
  if (file.mimetype && !CSV_MIME.has(file.mimetype) && !file.mimetype.includes("csv")) {
    // Allow common browser MIME quirks but reject obvious non-csv
    if (file.mimetype.startsWith("image/") || file.mimetype.includes("pdf")) {
      throw new ValidationError("Unsupported MIME type", [], ErrorCodes.UNSUPPORTED_FILE_TYPE);
    }
  }
  if (!file.buffer?.length) {
    throw new ValidationError("Empty file", [], ErrorCodes.EMPTY_CSV);
  }
}

export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  try {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];

    if (!records.length) {
      throw new ValidationError("CSV has no data rows", [], ErrorCodes.EMPTY_CSV);
    }

    const headers = Object.keys(records[0] ?? {});
    if (!headers.length) {
      throw new ValidationError("CSV has malformed headers", [], ErrorCodes.MALFORMED_HEADERS);
    }

    const rows = records.map((row) => {
      const out: Record<string, string> = {};
      for (const h of headers) {
        const v = row[h];
        out[h] = v == null ? "" : String(v);
      }
      return out;
    });

    return { headers, rows, totalRows: rows.length };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("The uploaded file could not be parsed", [], ErrorCodes.CSV_PARSE_FAILED);
  }
}
