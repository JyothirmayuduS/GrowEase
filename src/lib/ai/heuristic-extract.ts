import type { CrmLeadRecord } from "@/lib/types/crm";
import { normalizeCrmStatus, normalizeDataSource } from "@/lib/validation/crm-record";

const FIELD_ALIASES: Record<keyof CrmLeadRecord, string[]> = {
  created_at: ["created_at", "created", "date", "timestamp", "created_date"],
  name: ["name", "full_name", "fullname", "contact_name", "lead_name"],
  email: ["email", "email_address", "e_mail", "mail"],
  country_code: ["country_code", "dial_code", "phone_code"],
  mobile_without_country_code: ["mobile", "phone", "phone_number", "mobile_number", "contact_number"],
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

function pickFirstEmail(value: string): string {
  const parts = value.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  return parts[0] ?? "";
}

function parsePhone(value: string): { country_code: string; mobile: string } {
  const cleaned = value.trim();
  if (!cleaned) return { country_code: "", mobile: "" };

  const intl = cleaned.match(/^\+?(\d{1,3})[-\s]?(\d{6,14})$/);
  if (intl) {
    return { country_code: `+${intl[1]}`, mobile: intl[2] };
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length > 10) {
    return { country_code: `+${digits.slice(0, digits.length - 10)}`, mobile: digits.slice(-10) };
  }

  return { country_code: "", mobile: digits };
}

function mapRow(headers: string[], row: Record<string, string>): Partial<CrmLeadRecord> {
  const headerMap = buildHeaderMap(headers);
  const record: Partial<CrmLeadRecord> = {};

  for (const [field, sourceHeader] of Object.entries(headerMap) as [keyof CrmLeadRecord, string][]) {
    const value = String(row[sourceHeader] ?? "").trim();
    if (!value) continue;

    if (field === "email") {
      record.email = pickFirstEmail(value);
    } else if (field === "crm_status") {
      record.crm_status = normalizeCrmStatus(value);
    } else if (field === "data_source") {
      record.data_source = normalizeDataSource(value.replace(/\s+/g, "_"));
    } else if (field === "country_code" || field === "mobile_without_country_code") {
      // handled below via phone column
    } else {
      record[field] = value;
    }
  }

  const phoneHeader =
    headers.find((h) => normalizeHeader(h) === "phone") ??
    headers.find((h) => normalizeHeader(h) === "mobile") ??
    headers.find((h) => normalizeHeader(h) === "phone_number");

  if (phoneHeader && !record.mobile_without_country_code) {
    const parsed = parsePhone(String(row[phoneHeader] ?? ""));
    record.country_code = parsed.country_code;
    record.mobile_without_country_code = parsed.mobile;
  }

  return record;
}

export function heuristicExtractBatch(
  headers: string[],
  rows: Record<string, string>[]
): Partial<CrmLeadRecord>[] {
  return rows.map((row) => mapRow(headers, row));
}
