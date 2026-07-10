/**
 * PhoneExtractionService
 *
 * Scans ALL cells in a row for valid phone numbers — not just phone/mobile columns.
 * Rejects email addresses, dates, and IDs masquerading as phones.
 * Normalizes numbers to E.164 where possible.
 */

export interface PhoneExtractionResult {
  primaryPhone: {
    countryCode: string;
    number: string;
    e164: string;
  } | null;
  extraPhones: string[];
  invalidPhoneCandidates: string[];
  inferredCountryCode: string;
}

// ─────────────────────────────────────────────
// Phone candidate detection heuristics
// ─────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/** Date-like strings we should not treat as phone numbers. */
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/, // ISO date
  /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY or MM/DD/YYYY
  /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
  /^\w{3}\s+\d{1,2},?\s+\d{4}/, // Jan 1, 2024
];

function looksLikeDate(value: string): boolean {
  return DATE_PATTERNS.some((p) => p.test(value.trim()));
}

function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Normalize a raw phone string: remove spaces, dots, parens, dashes (keep + and digits). */
function normalizePhoneDigits(raw: string): { countryCode: string; number: string } {
  const cleaned = raw.trim().replace(/[\s\-.()\[\]]/g, "");

  // International format: +CC followed by local number
  const intlMatch = cleaned.match(/^\+(\d{1,3})(\d{6,14})$/);
  if (intlMatch) {
    return { countryCode: `+${intlMatch[1]}`, number: intlMatch[2] };
  }

  // Format: 00CC followed by local
  const doubleZeroMatch = cleaned.match(/^00(\d{1,3})(\d{6,14})$/);
  if (doubleZeroMatch) {
    return { countryCode: `+${doubleZeroMatch[1]}`, number: doubleZeroMatch[2] };
  }

  // Digits only
  const digitsOnly = cleaned.replace(/\D/g, "");

  // > 10 digits: try to split country code
  if (digitsOnly.length > 10 && digitsOnly.length <= 15) {
    const localLen = digitsOnly.length > 12 ? 10 : digitsOnly.length - (digitsOnly.length - 10);
    const ccDigits = digitsOnly.slice(0, digitsOnly.length - localLen);
    const localDigits = digitsOnly.slice(-localLen);
    if (ccDigits.length >= 1 && ccDigits.length <= 3) {
      return { countryCode: `+${ccDigits}`, number: localDigits };
    }
  }

  return { countryCode: "", number: digitsOnly };
}

/** Validate a phone number candidate. */
function isValidPhone(countryCode: string, number: string): boolean {
  const allDigits = (countryCode.replace(/\D/g, "") + number).length;
  // Valid total length: 7 to 15 digits (ITU-T E.164)
  return number.length >= 6 && number.length <= 14 && allDigits >= 7 && allDigits <= 15;
}

/** Build E.164 representation. */
function toE164(countryCode: string, number: string): string {
  const cc = countryCode.replace(/\D/g, "");
  const n = number.replace(/\D/g, "");
  return cc ? `+${cc}${n}` : n;
}

/** Split a cell on common phone separators. */
function splitPhoneCell(cellValue: string): string[] {
  return cellValue.split(/[;|\/]/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Try to extract a valid phone from a cell value.
 * Returns null if the cell doesn't look phone-like.
 */
function extractPhoneFromCell(
  cellValue: string
): { phones: { countryCode: string; number: string; e164: string }[]; invalid: string[] } | null {
  const raw = cellValue.trim();
  if (!raw) return null;
  if (looksLikeEmail(raw)) return null;
  if (looksLikeDate(raw)) return null;

  // Must contain at least 6 digit characters
  const digitCount = (raw.match(/\d/g) ?? []).length;
  if (digitCount < 6) return null;

  const parts = splitPhoneCell(raw);
  const validPhones: { countryCode: string; number: string; e164: string }[] = [];
  const invalid: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (looksLikeEmail(part)) continue;
    if (looksLikeDate(part)) continue;

    const partDigits = (part.match(/\d/g) ?? []).length;
    if (partDigits < 6) {
      invalid.push(part);
      continue;
    }

    const { countryCode, number } = normalizePhoneDigits(part);
    if (isValidPhone(countryCode, number)) {
      validPhones.push({ countryCode, number, e164: toE164(countryCode, number) });
    } else {
      invalid.push(part);
    }
  }

  if (validPhones.length === 0 && invalid.length === 0) return null;
  return { phones: validPhones, invalid };
}

/**
 * Scan every cell in a row for phone numbers.
 * Infers +91 for 10-digit numbers when countryContext === "India" or "IN".
 */
export function extractPhonesFromRow(
  record: Record<string, string>,
  countryContext?: string
): PhoneExtractionResult {
  const seenE164 = new Set<string>();
  const allPhones: { countryCode: string; number: string; e164: string }[] = [];
  const allInvalid: string[] = [];

  const isIndiaContext =
    countryContext?.toUpperCase() === "INDIA" ||
    countryContext?.toUpperCase() === "IN" ||
    countryContext === "+91";

  for (const cellValue of Object.values(record)) {
    const result = extractPhoneFromCell(String(cellValue ?? ""));
    if (!result) continue;

    for (const phone of result.phones) {
      // Infer +91 for 10-digit Indian numbers
      let { countryCode, number, e164 } = phone;
      if (!countryCode && isIndiaContext && number.length === 10) {
        countryCode = "+91";
        e164 = `+91${number}`;
      }

      const key = e164 || number;
      if (!seenE164.has(key)) {
        seenE164.add(key);
        allPhones.push({ countryCode, number, e164: e164 || number });
      }
    }

    for (const inv of result.invalid) {
      if (!allInvalid.includes(inv)) allInvalid.push(inv);
    }
  }

  const [primary, ...rest] = allPhones;
  const inferredCountryCode = primary?.countryCode ?? "";

  return {
    primaryPhone: primary ?? null,
    extraPhones: rest.map((p) => (p.countryCode ? `${p.countryCode} ${p.number}` : p.number)),
    invalidPhoneCandidates: allInvalid,
    inferredCountryCode,
  };
}
