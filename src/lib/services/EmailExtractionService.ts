/**
 * EmailExtractionService
 *
 * Scans ALL cells in a row for valid email addresses — not just columns named "email".
 * Returns primary email + extra emails for crm_note.
 */

export interface EmailExtractionResult {
  primaryEmail: string;
  extraEmails: string[];
  invalidEmailCandidates: string[];
}

// RFC-5321 practical email regex — allows plus-addressing, subdomains, etc.
// Rejects emails with whitespace, control characters, or no valid TLD.
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// These are separators between multiple emails in one cell
const CELL_SPLIT_RE = /[;|,\s]+/;

/** Check if a candidate email string is syntactically valid. */
function isValidEmail(candidate: string): boolean {
  const trimmed = candidate.trim();
  // Must contain exactly one @
  const atCount = (trimmed.match(/@/g) ?? []).length;
  if (atCount !== 1) return false;

  // Full match against email regex
  const match = trimmed.match(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/);
  return match !== null;
}

/** Normalize an email: lowercase the domain, trim whitespace. */
function normalizeEmail(email: string): string {
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf("@");
  if (atIdx < 0) return trimmed.toLowerCase();
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1).toLowerCase();
  return `${local}@${domain}`;
}

/** Extract all valid emails from a single cell value. */
function extractEmailsFromCell(cellValue: string): { valid: string[]; invalid: string[] } {
  const raw = cellValue.trim();
  if (!raw || !raw.includes("@")) return { valid: [], invalid: [] };

  const valid: string[] = [];
  const invalid: string[] = [];

  // Try regex extraction first (handles emails without separators)
  const matches = raw.match(EMAIL_RE) ?? [];
  if (matches.length > 0) {
    for (const m of matches) {
      const normalized = normalizeEmail(m);
      if (isValidEmail(normalized)) {
        valid.push(normalized);
      } else {
        invalid.push(m);
      }
    }
    return { valid, invalid };
  }

  // Fallback: split by separators and check each
  const parts = raw.split(CELL_SPLIT_RE).filter(Boolean);
  for (const part of parts) {
    if (!part.includes("@")) continue;
    const normalized = normalizeEmail(part);
    if (isValidEmail(normalized)) {
      valid.push(normalized);
    } else {
      invalid.push(part);
    }
  }

  return { valid, invalid };
}

/**
 * Scan every cell in a row for email addresses.
 * Returns the first unique valid email as primary, rest as extras.
 */
export function extractEmailsFromRow(
  record: Record<string, string>
): EmailExtractionResult {
  const seenNormalized = new Set<string>();
  const allValid: string[] = [];
  const allInvalid: string[] = [];

  for (const cellValue of Object.values(record)) {
    const { valid, invalid } = extractEmailsFromCell(String(cellValue ?? ""));

    for (const email of valid) {
      const lower = email.toLowerCase();
      if (!seenNormalized.has(lower)) {
        seenNormalized.add(lower);
        allValid.push(email);
      }
    }

    for (const inv of invalid) {
      if (!allInvalid.includes(inv)) {
        allInvalid.push(inv);
      }
    }
  }

  const [primaryEmail = "", ...extraEmails] = allValid;

  return {
    primaryEmail,
    extraEmails,
    invalidEmailCandidates: allInvalid,
  };
}
