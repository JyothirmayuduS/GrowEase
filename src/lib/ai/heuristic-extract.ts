import type { CrmLeadRecord } from "@/lib/types/crm";
import { normalizeCrmStatus, normalizeDataSource } from "@/lib/validation/crm-record";
import {
  appendToCrmNote,
  splitEmails,
  splitPhones,
} from "@/lib/validation/contact-fields";

/**
 * Broad aliases for Facebook Lead Ads, Zoho, Google Ads, WhatsApp sheets,
 * and agent-typed real-estate lists. Matching is on normalized headers
 * (lowercase, spaces/hyphens → underscores).
 */
const FIELD_ALIASES: Record<keyof CrmLeadRecord, string[]> = {
  created_at: [
    "created_at",
    "created",
    "date",
    "timestamp",
    "created_date",
    "created_time",
    "lead_created",
    "submitted_at",
    "form_submit_time",
  ],
  name: [
    "name",
    "full_name",
    "fullname",
    "contact_name",
    "lead_name",
    "customer_name",
    "naam",
    "contact",
    "prospect_name",
    "name_contact",
  ],
  email: [
    "email",
    "email_address",
    "e_mail",
    "mail",
    "mail_id",
    "email_id",
    "work_email",
    "primary_email",
  ],
  country_code: ["country_code", "dial_code", "phone_code", "isd"],
  mobile_without_country_code: [
    "mobile",
    "phone",
    "phone_number",
    "mobile_number",
    "contact_number",
    "alt_phone",
    "mob",
    "whatsapp",
    "whatsapp_number",
    "whatsapp_no",
    "wa_number",
    "cell",
    "cellphone",
    "primary_phone",
  ],
  company: [
    "company",
    "organization",
    "org",
    "organisation",
    "business",
    "company_name",
    "account_name",
  ],
  city: ["city", "city_name", "location", "town", "locality"],
  state: ["state", "state_name", "province", "region"],
  country: ["country", "country_name"],
  lead_owner: [
    "lead_owner",
    "owner",
    "assigned_to",
    "sales_rep",
    "agent",
    "owner_name",
    "handled_by",
  ],
  crm_status: [
    "crm_status",
    "status",
    "lead_status",
    "stage",
    "pipeline_status",
    "pipeline",
  ],
  crm_note: [
    "crm_note",
    "note",
    "notes",
    "comments",
    "remark",
    "remarks",
    "comment",
    "follow_up",
    "followup",
    "coments",
    "agent_notes",
  ],
  data_source: [
    "data_source",
    "source",
    "lead_source",
    "project",
    "project_name",
    "builder_project",
    "campaign",
    "ad_name",
    "form_name",
    "platform",
    "soruce",
  ],
  possession_time: [
    "possession_time",
    "property_possession",
    "possession",
    "handover",
    "possession_date",
    "ready_by",
    "possesion",
  ],
  description: [
    "description",
    "extra_info",
    "details",
    "remarks_extra",
    "additional_info",
    "message",
  ],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^\w\s/-]+/g, "")
    .replace(/[\s/-]+/g, "_");
}

/** Small Levenshtein for typo headers (Emial → email, Phne → phone). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + cost);
      diag = tmp;
    }
  }
  return prev[b.length];
}

function fuzzyAliasMatch(key: string, aliases: string[]): boolean {
  if (aliases.includes(key)) return true;
  // Compound headers: "name_contact", "builder_project"
  const tokens = key.split("_").filter(Boolean);
  if (tokens.some((t) => aliases.includes(t))) return true;
  if (aliases.some((alias) => key.endsWith(`_${alias}`) || key.startsWith(`${alias}_`))) {
    return true;
  }
  // Allow 1–2 char typos (Emial→email, Citty→city, Phne→phone)
  return aliases.some((alias) => {
    if (Math.abs(alias.length - key.length) > 2) return false;
    const maxDist = alias.length <= 4 ? 1 : 2;
    return editDistance(key, alias) <= maxDist;
  });
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof CrmLeadRecord, string>> {
  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));
  const map: Partial<Record<keyof CrmLeadRecord, string>> = {};
  const used = new Set<string>();

  // Exact / alias pass first
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    keyof CrmLeadRecord,
    string[],
  ][]) {
    const match = normalized.find(
      ({ key, raw }) => aliases.includes(key) && !used.has(raw)
    );
    if (match) {
      map[field] = match.raw;
      used.add(match.raw);
    }
  }

  // Fuzzy pass for remaining fields (typo headers)
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    keyof CrmLeadRecord,
    string[],
  ][]) {
    if (map[field]) continue;
    const match = normalized.find(
      ({ key, raw }) => !used.has(raw) && fuzzyAliasMatch(key, aliases)
    );
    if (match) {
      map[field] = match.raw;
      used.add(match.raw);
    }
  }

  return map;
}

function parsePhone(value: string): {
  country_code: string;
  mobile: string;
  extras: string[];
} {
  const parts = splitPhones(value);
  if (parts.length === 0) return { country_code: "", mobile: "", extras: [] };

  const first = parts[0];
  const extras = parts.slice(1);

  const explicitIntl = first.match(/^\+(\d{1,3})[-\s.]?([\d\s.-]{6,14})$/);
  if (explicitIntl) {
    return {
      country_code: `+${explicitIntl[1]}`,
      mobile: explicitIntl[2].replace(/\D/g, ""),
      extras,
    };
  }

  const digits = first.replace(/\D/g, "");
  if (digits.length > 10) {
    return {
      country_code: `+${digits.slice(0, digits.length - 10)}`,
      mobile: digits.slice(-10),
      extras,
    };
  }

  return { country_code: "", mobile: digits, extras };
}

function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Scan any unmapped cell for an email if email field is still empty. */
function findEmailInRow(
  row: Record<string, string>,
  usedHeaders: Set<string>
): { email: string; extras: string[] } | null {
  for (const [header, raw] of Object.entries(row)) {
    if (usedHeaders.has(header)) continue;
    const value = String(raw ?? "").trim();
    if (!value.includes("@")) continue;
    const emails = splitEmails(value);
    if (emails.length === 0) continue;
    return { email: emails[0], extras: emails.slice(1) };
  }
  return null;
}

function findPhoneInRow(
  row: Record<string, string>,
  usedHeaders: Set<string>
): ReturnType<typeof parsePhone> | null {
  for (const [header, raw] of Object.entries(row)) {
    if (usedHeaders.has(header)) continue;
    const value = String(raw ?? "").trim();
    if (!looksLikePhone(value)) continue;
    return parsePhone(value);
  }
  return null;
}

function mapRow(headers: string[], row: Record<string, string>): Partial<CrmLeadRecord> {
  const headerMap = buildHeaderMap(headers);
  const record: Partial<CrmLeadRecord> = {};
  let note = "";
  const usedHeaders = new Set(Object.values(headerMap).filter(Boolean) as string[]);

  for (const [field, sourceHeader] of Object.entries(headerMap) as [
    keyof CrmLeadRecord,
    string,
  ][]) {
    const value = String(row[sourceHeader] ?? "").trim();
    if (!value) continue;

    if (field === "email") {
      const emails = splitEmails(value);
      record.email = emails[0] ?? "";
      if (emails.length > 1) {
        note = appendToCrmNote(note, `Extra emails: ${emails.slice(1).join(", ")}`);
      }
    } else if (field === "crm_status") {
      record.crm_status = normalizeCrmStatus(value);
    } else if (field === "data_source") {
      const mapped = normalizeDataSource(value);
      if (mapped) {
        record.data_source = mapped;
      } else {
        note = appendToCrmNote(note, `Source: ${value}`);
      }
    } else if (field === "crm_note") {
      note = appendToCrmNote(note, value);
    } else if (field === "country_code" || field === "mobile_without_country_code") {
      // handled via phone column below
    } else {
      record[field] = value;
    }
  }

  const phoneHeader = headerMap.mobile_without_country_code;

  if (phoneHeader) {
    const parsed = parsePhone(String(row[phoneHeader] ?? ""));
    if (parsed.mobile) {
      record.country_code = record.country_code || parsed.country_code;
      record.mobile_without_country_code = parsed.mobile;
    }
    if (parsed.extras.length > 0) {
      note = appendToCrmNote(note, `Extra phones: ${parsed.extras.join(", ")}`);
    }
  } else if (!record.mobile_without_country_code) {
    const found = findPhoneInRow(row, usedHeaders);
    if (found?.mobile) {
      record.country_code = found.country_code;
      record.mobile_without_country_code = found.mobile;
      if (found.extras.length > 0) {
        note = appendToCrmNote(note, `Extra phones: ${found.extras.join(", ")}`);
      }
    }
  }

  if (!record.email) {
    const found = findEmailInRow(row, usedHeaders);
    if (found) {
      record.email = found.email;
      if (found.extras.length > 0) {
        note = appendToCrmNote(note, `Extra emails: ${found.extras.join(", ")}`);
      }
    }
  }

  if (note) record.crm_note = note;

  return record;
}

export function heuristicExtractBatch(
  headers: string[],
  rows: Record<string, string>[]
): Partial<CrmLeadRecord>[] {
  return rows.map((row) => mapRow(headers, row));
}
