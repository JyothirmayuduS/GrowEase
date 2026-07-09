import { CRM_STATUSES, DATA_SOURCES } from "@/lib/constants/crm";
import type { CrmLeadRecord, CrmStatus, DataSource } from "@/lib/types/crm";

export function emptyCrmRecord(): CrmLeadRecord {
  return {
    created_at: "",
    name: "",
    email: "",
    country_code: "",
    mobile_without_country_code: "",
    company: "",
    city: "",
    state: "",
    country: "",
    lead_owner: "",
    crm_status: "",
    crm_note: "",
    data_source: "",
    possession_time: "",
    description: "",
  };
}

export function normalizeCrmStatus(value: unknown): CrmStatus | "" {
  if (typeof value !== "string") return "";
  const upper = value.trim().toUpperCase().replace(/\s+/g, "_");
  return (CRM_STATUSES as readonly string[]).includes(upper) ? (upper as CrmStatus) : "";
}

export function normalizeDataSource(value: unknown): DataSource | "" {
  if (typeof value !== "string") return "";
  const lower = value.trim().toLowerCase().replace(/\s+/g, "_");
  return (DATA_SOURCES as readonly string[]).includes(lower) ? (lower as DataSource) : "";
}

export function hasContactInfo(record: CrmLeadRecord): boolean {
  return Boolean(record.email.trim() || record.mobile_without_country_code.trim());
}

export function isValidCreatedAt(value: string): boolean {
  if (!value.trim()) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function sanitizeCrmRecord(raw: Partial<CrmLeadRecord>): CrmLeadRecord {
  const base = emptyCrmRecord();
  const record: CrmLeadRecord = {
    ...base,
    created_at: String(raw.created_at ?? "").trim(),
    name: String(raw.name ?? "").trim(),
    email: String(raw.email ?? "").trim(),
    country_code: String(raw.country_code ?? "").trim(),
    mobile_without_country_code: String(raw.mobile_without_country_code ?? "").trim(),
    company: String(raw.company ?? "").trim(),
    city: String(raw.city ?? "").trim(),
    state: String(raw.state ?? "").trim(),
    country: String(raw.country ?? "").trim(),
    lead_owner: String(raw.lead_owner ?? "").trim(),
    crm_status: normalizeCrmStatus(raw.crm_status),
    crm_note: String(raw.crm_note ?? "").trim().replace(/\n/g, "\\n"),
    data_source: normalizeDataSource(raw.data_source),
    possession_time: String(raw.possession_time ?? "").trim(),
    description: String(raw.description ?? "").trim().replace(/\n/g, "\\n"),
  };

  if (record.created_at && !isValidCreatedAt(record.created_at)) {
    record.created_at = "";
  }

  return record;
}

export function getSkipReason(record: CrmLeadRecord): string | null {
  if (!hasContactInfo(record)) {
    return "Record has neither email nor mobile number";
  }
  return null;
}
