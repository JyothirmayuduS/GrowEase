/**
 * DateNormalizationService
 *
 * Explicitly parses dates from common formats without relying solely on new Date().
 * Returns ISO 8601 strings or empty string for invalid/ambiguous inputs.
 */

export interface DateNormalizationResult {
  value: string; // ISO 8601 or ""
  isValid: boolean;
  warning?: "INVALID_DATE" | "AMBIGUOUS_DATE";
}

// ─── Excel serial date constants ──────────────────────────────────────────────
// Excel epoch is 1900-01-01 (with a leap year bug for 1900, so offset = 25569 for Unix epoch)
const EXCEL_EPOCH_OFFSET = 25569; // Days between 1900-01-01 and 1970-01-01
const MS_PER_DAY = 86400000;
const EXCEL_MIN = 1; // Excel serials below this are invalid
const EXCEL_MAX = 60000; // ~2064 — reject anything beyond this as likely not a serial

/** Parse YYYY-MM-DD or YYYY-MM-DD HH:mm:ss format. */
function parseIsoLike(raw: string): Date | null {
  // ISO 8601: 2026-07-10T10:30:00.000Z or 2026-07-10T10:30:00Z
  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?)?$/
  );
  if (isoMatch) {
    const [, y, mo, d, h = "0", mi = "0", s = "0", , tz] = isoMatch;
    if (!tz) {
      // No timezone — treat as UTC to avoid day-shift across timezones
      const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      const date = new Date(ms);
      return isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** Parse DD/MM/YYYY format (day first — common in India/UK). */
function parseDdMmYyyy(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, mo, y] = match;
  if (Number(mo) > 12 || Number(d) > 31) return null;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  const date = new Date(ms);
  return isNaN(date.getTime()) ? null : date;
}

/** Parse MM/DD/YYYY format (US style). */
function parseMmDdYyyy(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, mo, d, y] = match;
  if (Number(mo) > 12 || Number(d) > 31) return null;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  const date = new Date(ms);
  return isNaN(date.getTime()) ? null : date;
}

/** Detect and parse Excel serial dates (numeric strings in range). */
function parseExcelSerial(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!/^\d{4,5}$/.test(trimmed)) return null; // only 4-5 digit numbers
  const serial = Number(trimmed);
  if (serial < EXCEL_MIN || serial > EXCEL_MAX) return null;

  // Convert Excel serial to JS Date
  const ms = (serial - EXCEL_EPOCH_OFFSET) * MS_PER_DAY;
  const date = new Date(ms);
  return isNaN(date.getTime()) ? null : date;
}

/** Try DD-MM-YYYY format. */
function parseDdMmYyyyDash(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const [, d, mo, y] = match;
  if (Number(mo) > 12 || Number(d) > 31) return null;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  const date = new Date(ms);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Is a slash-format date ambiguous?
 * DD/MM/YYYY vs MM/DD/YYYY is ambiguous when both d and mo are ≤ 12.
 */
function isSlashDateAmbiguous(raw: string): boolean {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;
  const [, a, b] = match;
  // Ambiguous when both first and second parts could be month
  return Number(a) <= 12 && Number(b) <= 12;
}

/** Format a Date to ISO 8601 UTC string. */
function toIso(date: Date): string {
  return date.toISOString();
}

/**
 * Normalize a date value from any common format to ISO 8601.
 *
 * Order of precedence:
 * 1. ISO 8601 / YYYY-MM-DD / YYYY-MM-DD HH:mm:ss
 * 2. DD/MM/YYYY (if day > 12, unambiguous)
 * 3. MM/DD/YYYY (if month > 12 in DD position, unambiguous)
 * 4. Ambiguous slash dates → AMBIGUOUS_DATE warning
 * 5. DD-MM-YYYY
 * 6. Excel serial number
 * 7. Fallback new Date() for other formats
 */
export function normalizeCreatedAt(value: unknown): DateNormalizationResult {
  if (value === null || value === undefined) {
    return { value: "", isValid: false, warning: "INVALID_DATE" };
  }

  const raw = String(value).trim();
  if (!raw) {
    return { value: "", isValid: false };
  }

  // ─── ISO 8601 / YYYY-MM-DD ────────────────────────────────────────────────
  const isoDate = parseIsoLike(raw);
  if (isoDate) {
    return { value: toIso(isoDate), isValid: true };
  }

  // ─── Slash format — handle ambiguity ─────────────────────────────────────
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [a, b] = raw.split("/").map(Number);

    if (a > 12) {
      // First part can only be day → DD/MM/YYYY
      const date = parseDdMmYyyy(raw);
      if (date) return { value: toIso(date), isValid: true };
    } else if (b > 12) {
      // Second part can only be day → MM/DD/YYYY
      const date = parseMmDdYyyy(raw);
      if (date) return { value: toIso(date), isValid: true };
    } else if (isSlashDateAmbiguous(raw)) {
      // Could be either — mark as ambiguous, attempt DD/MM/YYYY as default
      const date = parseDdMmYyyy(raw);
      if (date) {
        return { value: toIso(date), isValid: true, warning: "AMBIGUOUS_DATE" };
      }
      return { value: "", isValid: false, warning: "AMBIGUOUS_DATE" };
    }
  }

  // ─── DD-MM-YYYY ───────────────────────────────────────────────────────────
  const dashDate = parseDdMmYyyyDash(raw);
  if (dashDate) {
    return { value: toIso(dashDate), isValid: true };
  }

  // ─── Excel serial ─────────────────────────────────────────────────────────
  const excelDate = parseExcelSerial(raw);
  if (excelDate) {
    return { value: toIso(excelDate), isValid: true };
  }

  // ─── Fallback: let JS try ─────────────────────────────────────────────────
  const fallback = new Date(raw);
  if (!isNaN(fallback.getTime())) {
    return { value: toIso(fallback), isValid: true };
  }

  // ─── Completely invalid ───────────────────────────────────────────────────
  return { value: "", isValid: false, warning: "INVALID_DATE" };
}
