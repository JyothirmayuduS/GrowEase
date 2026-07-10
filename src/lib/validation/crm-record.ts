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

/** Map messy human status labels → allowed CRM enum (or blank). */
export function normalizeCrmStatus(value: unknown): CrmStatus | "" {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if ((CRM_STATUSES as readonly string[]).includes(upper)) {
    return upper as CrmStatus;
  }

  const lower = raw.toLowerCase();
  if (
    /sale\s*done|closed|booked|converted|won|deal\s*done|token\s*done/.test(lower)
  ) {
    return "SALE_DONE";
  }
  if (
    /bad\s*lead|not\s*interested|junk|spam|wrong\s*number|invalid\s*lead|fake\s*lead/.test(
      lower
    )
  ) {
    return "BAD_LEAD";
  }
  if (
    /did\s*not\s*connect|dnc|not\s*reachable|no\s*answer|busy|ringing|switched\s*off/.test(
      lower
    )
  ) {
    return "DID_NOT_CONNECT";
  }
  if (
    /good\s*lead|follow\s*up|hot|interested|callback|call\s*back|warm|prospect/.test(
      lower
    )
  ) {
    return "GOOD_LEAD_FOLLOW_UP";
  }

  return "";
}

/** Map project / source nicknames → allowed data_source enum (or blank). */
export function normalizeDataSource(value: unknown): DataSource | "" {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  const lower = raw.toLowerCase().replace(/\s+/g, "_");
  if ((DATA_SOURCES as readonly string[]).includes(lower)) {
    return lower as DataSource;
  }

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/leadsondemand|^lod$/.test(compact)) return "leads_on_demand";
  if (/meridian/.test(compact)) return "meridian_tower";
  if (/edenpark|^eden$/.test(compact)) return "eden_park";
  if (/varah/.test(compact)) return "varah_swamy";
  if (/sarjapur/.test(compact)) return "sarjapur_plots";

  return "";
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
  const str = escapeNewlines(String(value ?? "").trim());
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
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
