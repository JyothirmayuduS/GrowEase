import { CRM_STATUSES, DATA_SOURCES } from "@/lib/constants/crm";
import type { CrmLeadRecord, CrmStatus, DataSource } from "@/lib/types/crm";
import {
  applyMultiContactRules,
  escapeNewlines,
} from "@/lib/validation/contact-fields";

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

function textField(value: unknown): string {
  return escapeNewlines(String(value ?? "").trim());
}

/**
 * Server-side sanitize after AI/heuristic extraction.
 * Re-validates enums, created_at, multi-contact rules, and newline escaping.
 */
export function sanitizeCrmRecord(raw: Partial<CrmLeadRecord>): CrmLeadRecord {
  const base = emptyCrmRecord();

  let record: CrmLeadRecord = {
    ...base,
    created_at: String(raw.created_at ?? "").trim(),
    name: textField(raw.name),
    email: String(raw.email ?? "").trim(),
    country_code: String(raw.country_code ?? "").trim(),
    mobile_without_country_code: String(raw.mobile_without_country_code ?? "").trim(),
    company: textField(raw.company),
    city: textField(raw.city),
    state: textField(raw.state),
    country: textField(raw.country),
    lead_owner: textField(raw.lead_owner),
    crm_status: normalizeCrmStatus(raw.crm_status),
    crm_note: textField(raw.crm_note),
    data_source: normalizeDataSource(raw.data_source),
    possession_time: textField(raw.possession_time),
    description: textField(raw.description),
  };

  const contacts = applyMultiContactRules({
    email: record.email,
    mobile_without_country_code: record.mobile_without_country_code,
    country_code: record.country_code,
    crm_note: record.crm_note,
  });

  record = {
    ...record,
    email: contacts.email,
    mobile_without_country_code: contacts.mobile_without_country_code.replace(/\D/g, ""),
    country_code: contacts.country_code,
    crm_note: escapeNewlines(contacts.crm_note),
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

/** Validate AI batch shape: must be an array with one entry per input row (padded if short). */
export function normalizeAiBatchRecords(
  records: unknown,
  expectedCount: number
): Partial<CrmLeadRecord>[] {
  if (!Array.isArray(records)) {
    throw new Error("AI response missing records array");
  }

  const list = records.map((item) =>
    item && typeof item === "object" ? (item as Partial<CrmLeadRecord>) : {}
  );

  while (list.length < expectedCount) {
    list.push({});
  }

  return list.slice(0, expectedCount);
}
