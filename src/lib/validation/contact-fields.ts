/**
 * Server-side enforcement of multi-email / multi-phone → first value + crm_note.
 * Do not rely on the LLM alone for this rule.
 */

const EMAIL_RE = /[^\s@;,|/]+@[^\s@;,|/]+\.[^\s@;,|/]+/gi;
const PHONE_SPLIT_RE = /[;/|]/;

export function splitEmails(value: string): string[] {
  const matches = value.match(EMAIL_RE) ?? [];
  return matches.map((e) => e.trim()).filter(Boolean);
}

export function splitPhones(value: string): string[] {
  return value
    .split(PHONE_SPLIT_RE)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function appendToCrmNote(existing: string, addition: string): string {
  const a = existing.trim();
  const b = addition.trim();
  if (!b) return a;
  if (!a) return b;
  if (a.includes(b)) return a;
  return `${a} | ${b}`;
}

export function applyMultiContactRules(record: {
  email: string;
  mobile_without_country_code: string;
  country_code: string;
  crm_note: string;
}): {
  email: string;
  mobile_without_country_code: string;
  country_code: string;
  crm_note: string;
} {
  let { email, mobile_without_country_code, country_code, crm_note } = record;

  const emails = splitEmails(email);
  if (emails.length > 0) {
    email = emails[0];
  }

  const phones = splitPhones(mobile_without_country_code);
  if (phones.length > 0) {
    const first = phones[0];
    const parsed = parsePrimaryPhone(first);
    mobile_without_country_code = parsed.mobile;
    if (!country_code && parsed.country_code) {
      country_code = parsed.country_code;
    }
  }

  return { email, mobile_without_country_code, country_code, crm_note };
}

/**
 * Parse a single phone token.
 * Do not treat bare 10-digit locals as +CCC + rest (that turned 9848012345 into 8012345).
 */
export function parsePrimaryPhone(value: string): { country_code: string; mobile: string } {
  const cleaned = value.trim();
  if (!cleaned) return { country_code: "", mobile: "" };

  const explicitIntl = cleaned.match(/^\+(\d{1,3})[-\s.]?([\d\s.-]{6,14})$/);
  if (explicitIntl) {
    return {
      country_code: `+${explicitIntl[1]}`,
      mobile: explicitIntl[2].replace(/\D/g, ""),
    };
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length > 10) {
    return {
      country_code: `+${digits.slice(0, digits.length - 10)}`,
      mobile: digits.slice(-10),
    };
  }

  return { country_code: "", mobile: digits };
}

/** Escape newlines in a string so records stay single-line in CSV/JSON. */
export function escapeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\\n").replace(/\n/g, "\\n").replace(/\r/g, "\\n");
}
