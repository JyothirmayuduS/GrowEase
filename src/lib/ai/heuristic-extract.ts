import type { CrmLeadRecord } from "@/lib/types/crm";
import { normalizeCrmStatus, normalizeDataSource } from "@/lib/validation/crm-record";
import {
  appendToCrmNote,
  splitEmails,
  splitPhones,
} from "@/lib/validation/contact-fields";

const FIELD_ALIASES: Record<keyof CrmLeadRecord, string[]> = {
  created_at: ["created_at", "created", "date", "timestamp", "created_date"],
  name: ["name", "full_name", "fullname", "contact_name", "lead_name"],
  email: ["email", "email_address", "e_mail", "mail"],
  country_code: ["country_code", "dial_code", "phone_code"],
  mobile_without_country_code: [
    "mobile",
    "phone",
    "phone_number",
    "mobile_number",
    "contact_number",
    "alt_phone",
  ],
  company: ["company", "organization", "org", "organisation", "business"],
  city: ["city", "city_name"],
  state: ["state", "state_name", "province"],
  country: ["country", "country_name"],
  lead_owner: ["lead_owner", "owner", "assigned_to", "sales_rep"],
  crm_status: ["crm_status", "status", "lead_status"],
  crm_note: ["crm_note", "note", "notes", "comments"],
  data_source: ["data_source", "source", "lead_source"],
  possession_time: ["possession_time", "property_possession", "possession"],
  description: ["description", "extra_info", "details", "remarks"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof CrmLeadRecord, string>> {
  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));
  const map: Partial<Record<keyof CrmLeadRecord, string>> = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof CrmLeadRecord, string[]][]) {
    const match = normalized.find(({ key }) => aliases.includes(key));
    if (match) map[field] = match.raw;
  }

  return map;
}

function parsePhone(value: string): { country_code: string; mobile: string; extras: string[] } {
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

function mapRow(headers: string[], row: Record<string, string>): Partial<CrmLeadRecord> {
  const headerMap = buildHeaderMap(headers);
  const record: Partial<CrmLeadRecord> = {};
  let note = "";

  for (const [field, sourceHeader] of Object.entries(headerMap) as [keyof CrmLeadRecord, string][]) {
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
      record.data_source = normalizeDataSource(value.replace(/\s+/g, "_"));
    } else if (field === "crm_note") {
      note = appendToCrmNote(note, value);
    } else if (field === "country_code" || field === "mobile_without_country_code") {
      // handled via phone column below
    } else {
      record[field] = value;
    }
  }

  const phoneHeader =
    headerMap.mobile_without_country_code ??
    headers.find((h) => ["phone", "mobile", "phone_number"].includes(normalizeHeader(h)));

  if (phoneHeader) {
    const parsed = parsePhone(String(row[phoneHeader] ?? ""));
    if (parsed.mobile) {
      record.country_code = record.country_code || parsed.country_code;
      record.mobile_without_country_code = parsed.mobile;
    }
    if (parsed.extras.length > 0) {
      note = appendToCrmNote(note, `Extra phones: ${parsed.extras.join(", ")}`);
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
