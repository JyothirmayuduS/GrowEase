/**
 * DuplicateDetectionService
 *
 * Tracks import-level duplicates by fingerprinting on normalized email + phone.
 * Does NOT flag duplicates based only on matching names.
 */

import { createHash } from "crypto";

export type DuplicateStatus = "UNIQUE" | "DUPLICATE_IN_FILE" | "DUPLICATE_IN_CRM" | "POSSIBLE_DUPLICATE";

export interface DuplicateCheckResult {
  status: DuplicateStatus;
  firstSeenAtRow?: number;
  reason?: string;
}

/** Normalize a phone number to bare digits for fingerprinting. */
function normalizePhoneForFingerprint(countryCode: string, phone: string): string {
  const ccDigits = countryCode.replace(/\D/g, "");
  const phoneDigits = phone.replace(/\D/g, "");
  return ccDigits ? `${ccDigits}${phoneDigits}` : phoneDigits;
}

/** Normalize an email for fingerprinting (case-insensitive). */
function normalizeEmailForFingerprint(email: string): string {
  return email.trim().toLowerCase();
}

/** Build a stable fingerprint for a record. Returns null if no contact info. */
export function buildLeadFingerprint(
  email: string,
  countryCode: string,
  phone: string
): string | null {
  const normEmail = normalizeEmailForFingerprint(email);
  const normPhone = normalizePhoneForFingerprint(countryCode, phone);

  if (!normEmail && !normPhone) return null;

  const key = `${normEmail}::${normPhone}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/**
 * Import-session duplicate tracker.
 * Instantiate one per import job; pass the same instance to all rows.
 */
export class DuplicateDetectionService {
  private seen = new Map<string, number>(); // fingerprint → first row number

  /**
   * Check if a record is a duplicate.
   * @param email - normalized primary email
   * @param countryCode - country code (e.g., "+91")
   * @param phone - phone digits without country code
   * @param rowNumber - 1-based row number in the import
   */
  check(
    email: string,
    countryCode: string,
    phone: string,
    rowNumber: number
  ): DuplicateCheckResult {
    const fingerprint = buildLeadFingerprint(email, countryCode, phone);

    if (!fingerprint) {
      return { status: "UNIQUE" };
    }

    const existingRow = this.seen.get(fingerprint);
    if (existingRow !== undefined) {
      return {
        status: "DUPLICATE_IN_FILE",
        firstSeenAtRow: existingRow,
        reason: `Duplicate of row ${existingRow} (same email/phone)`,
      };
    }

    this.seen.set(fingerprint, rowNumber);
    return { status: "UNIQUE" };
  }

  /** Total unique fingerprints seen so far. */
  get uniqueCount(): number {
    return this.seen.size;
  }

  /** Reset state for a new import. */
  reset(): void {
    this.seen.clear();
  }
}
