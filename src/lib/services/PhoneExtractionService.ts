/**
 * PhoneExtractionService
 *
 * Scans ALL cells in a row for valid phone numbers — not just phone/mobile columns.
 * Rejects email addresses, dates, and IDs masquerading as phones.
 * Normalizes numbers to E.164 where possible.
 *
 * Uses a well-known country code list for precise CC splitting.
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

// ─── Country code list (ordered longest-first to avoid greedy mismatch) ──────
// Source: ITU-T E.164 - common codes that start with the same digits must be ordered
// longest first (e.g. +1 vs +1787, +44 vs +441).
const KNOWN_COUNTRY_CODES = [
  // 3-digit codes (must check before 2-digit and 1-digit)
  "1242", "1246", "1264", "1268", "1284", "1340", "1345", "1441",
  "1473", "1649", "1664", "1670", "1671", "1684", "1721", "1758",
  "1767", "1784", "1787", "1809", "1868", "1869", "1876", "1939",
  "212", "213", "216", "218", "220", "221", "222", "223", "224",
  "225", "226", "227", "228", "229", "230", "231", "232", "233",
  "234", "235", "236", "237", "238", "239", "240", "241", "242",
  "243", "244", "245", "246", "247", "248", "249", "250", "251",
  "252", "253", "254", "255", "256", "257", "258", "260", "261",
  "262", "263", "264", "265", "266", "267", "268", "269", "291",
  "297", "298", "299", "350", "351", "352", "353", "354", "355",
  "356", "357", "358", "359", "370", "371", "372", "373", "374",
  "375", "376", "377", "378", "380", "381", "382", "385", "386",
  "387", "389", "420", "421", "423", "500", "501", "502", "503",
  "504", "505", "506", "507", "508", "509", "590", "591", "592",
  "593", "594", "595", "596", "597", "598", "599", "670", "672",
  "673", "674", "675", "676", "677", "678", "679", "680", "681",
  "682", "683", "685", "686", "687", "688", "689", "690", "691",
  "692", "850", "852", "853", "855", "856", "880", "886", "960",
  "961", "962", "963", "964", "965", "966", "967", "968", "970",
  "971", "972", "973", "974", "975", "976", "977", "992", "993",
  "994", "995", "996", "998",
  // 2-digit codes
  "20", "27", "30", "31", "32", "33", "34", "36", "39",
  "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58",
  "60", "61", "62", "63", "64", "65", "66",
  "7",  // Russia/Kazakhstan (1 digit, check below)
  "81", "82", "84", "86",
  "90", "91", "92", "93", "94", "95", "98",
  // 1-digit codes
  "1",  // NANP — must come after all 1xxx codes
];

// ─── Email / date guard ───────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/,
  /^\d{2}\/\d{2}\/\d{4}/,
  /^\d{2}-\d{2}-\d{4}/,
  /^\w{3}\s+\d{1,2},?\s+\d{4}/,
];

function looksLikeDate(value: string): boolean {
  return DATE_PATTERNS.some((p) => p.test(value.trim()));
}

function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

// ─── Phone number parsing ─────────────────────────────────────────────────────

/**
 * Parse an international-format string (starting with +) into CC and national number.
 * Uses the known CC list to avoid greedy splitting like +919... → CC=+919.
 */
function parseInternationalPhone(cleaned: string): { countryCode: string; number: string } | null {
  if (!cleaned.startsWith("+")) return null;

  const digits = cleaned.slice(1); // strip leading +

  // Try matching known country codes (longest first)
  for (const cc of KNOWN_COUNTRY_CODES) {
    if (digits.startsWith(cc)) {
      const national = digits.slice(cc.length);
      if (national.length >= 6 && national.length <= 12) {
        return { countryCode: `+${cc}`, number: national };
      }
    }
  }

  // Fallback: try 1–3 digit CC heuristic
  for (let ccLen = 3; ccLen >= 1; ccLen--) {
    const cc = digits.slice(0, ccLen);
    const national = digits.slice(ccLen);
    if (/^\d+$/.test(cc) && national.length >= 6 && national.length <= 12) {
      return { countryCode: `+${cc}`, number: national };
    }
  }

  return null;
}

/** Normalize a raw phone string: remove spaces, dots, parens, dashes (keep + and digits). */
function normalizePhoneDigits(raw: string): { countryCode: string; number: string } {
  const cleaned = raw.trim().replace(/[\s\-.()[\]]/g, "");

  // International format: starts with +
  if (cleaned.startsWith("+")) {
    const parsed = parseInternationalPhone(cleaned);
    if (parsed) return parsed;
  }

  // Format: 00CC followed by local (treat as international)
  const doubleZeroMatch = cleaned.match(/^00(\d{1,3})(\d{6,14})$/);
  if (doubleZeroMatch) {
    return { countryCode: `+${doubleZeroMatch[1]}`, number: doubleZeroMatch[2] };
  }

  // Digits only — no country code
  const digitsOnly = cleaned.replace(/\D/g, "");
  return { countryCode: "", number: digitsOnly };
}

/** Validate a phone number candidate. */
function isValidPhone(countryCode: string, number: string): boolean {
  const allDigits = (countryCode.replace(/\D/g, "") + number).length;
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
      let { countryCode, e164 } = phone;
      const { number } = phone;
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
