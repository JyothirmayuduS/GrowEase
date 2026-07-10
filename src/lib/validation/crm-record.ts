import { CRM_STATUSES, DATA_SOURCES } from "@/lib/constants/crm";
import type { CrmLeadRecord, CrmStatus, DataSource } from "@/lib/types/crm";
import {
  applyMultiContactRules,
  escapeNewlines,
} from "@/lib/validation/contact-fields";
import { normalizeCreatedAt } from "@/lib/services/DateNormalizationService";

// ─── Return types (typed, structured) ────────────────────────────────────────

export interface CrmStatusResult {
  value: "" | CrmStatus;
  confidence: number; // 0.0 – 1.0
  warning?: string;
}

export interface DataSourceResult {
  value: "" | DataSource;
  confidence: number; // 0.0 – 1.0
  originalValue?: string;
}

// ─── Status keyword maps ──────────────────────────────────────────────────────

/**
 * Deterministic keyword → CRM status mapping.
 * Keywords are normalized before matching (lowercase, spaces/hyphens → single space).
 */
const STATUS_EXACT_MAP: Record<string, CrmStatus> = {
  // GOOD_LEAD_FOLLOW_UP
  "good lead": "GOOD_LEAD_FOLLOW_UP",
  "good lead follow up": "GOOD_LEAD_FOLLOW_UP",
  "good lead follow-up": "GOOD_LEAD_FOLLOW_UP",
  interested: "GOOD_LEAD_FOLLOW_UP",
  "follow up": "GOOD_LEAD_FOLLOW_UP",
  "follow-up": "GOOD_LEAD_FOLLOW_UP",
  followup: "GOOD_LEAD_FOLLOW_UP",
  callback: "GOOD_LEAD_FOLLOW_UP",
  "call back": "GOOD_LEAD_FOLLOW_UP",
  "call later": "GOOD_LEAD_FOLLOW_UP",
  reschedule: "GOOD_LEAD_FOLLOW_UP",
  "warm lead": "GOOD_LEAD_FOLLOW_UP",
  warm: "GOOD_LEAD_FOLLOW_UP",
  qualified: "GOOD_LEAD_FOLLOW_UP",
  "needs follow up": "GOOD_LEAD_FOLLOW_UP",
  "needs follow-up": "GOOD_LEAD_FOLLOW_UP",
  hot: "GOOD_LEAD_FOLLOW_UP",
  prospect: "GOOD_LEAD_FOLLOW_UP",
  open: "GOOD_LEAD_FOLLOW_UP",

  // DID_NOT_CONNECT
  "did not connect": "DID_NOT_CONNECT",
  "did not answer": "DID_NOT_CONNECT",
  dnc: "DID_NOT_CONNECT",
  "not connected": "DID_NOT_CONNECT",
  "no answer": "DID_NOT_CONNECT",
  "not reachable": "DID_NOT_CONNECT",
  "not reacheable": "DID_NOT_CONNECT",
  unreachable: "DID_NOT_CONNECT",
  busy: "DID_NOT_CONNECT",
  ringing: "DID_NOT_CONNECT",
  "switched off": "DID_NOT_CONNECT",
  "phone switched off": "DID_NOT_CONNECT",
  "call not answered": "DID_NOT_CONNECT",
  "call failed": "DID_NOT_CONNECT",
  "number busy": "DID_NOT_CONNECT",

  // BAD_LEAD
  "bad lead": "BAD_LEAD",
  "not interested": "BAD_LEAD",
  "not intrested": "BAD_LEAD",
  junk: "BAD_LEAD",
  spam: "BAD_LEAD",
  "wrong number": "BAD_LEAD",
  "invalid lead": "BAD_LEAD",
  "fake lead": "BAD_LEAD",
  "not relevant": "BAD_LEAD",
  "not-relevant": "BAD_LEAD",
  "irrelevant lead": "BAD_LEAD",

  // SALE_DONE
  "sale done": "SALE_DONE",
  "sales done": "SALE_DONE",
  "sale completed": "SALE_DONE",
  "deal closed": "SALE_DONE",
  "deal done": "SALE_DONE",
  "token done": "SALE_DONE",
  converted: "SALE_DONE",
  won: "SALE_DONE",
  "customer onboarded": "SALE_DONE",
  "payment completed": "SALE_DONE",
  "payment done": "SALE_DONE",
  closed: "SALE_DONE",
  booked: "SALE_DONE",
};

/** Normalize a raw status string for lookup. */
function normalizeStatusKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\-_]+/g, " ") // normalize hyphens and underscores
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

/**
 * Map messy human status labels → allowed CRM enum.
 * Returns structured result with confidence score.
 */
export function normalizeCrmStatus(value: unknown): CrmStatusResult {
  if (typeof value !== "string") return { value: "", confidence: 0 };
  const raw = value.trim();
  if (!raw) return { value: "", confidence: 0 };

  // ─── Exact enum pass-through ──────────────────────────────────────────────
  const upper = raw.toUpperCase().replace(/[\s\-]+/g, "_");
  if ((CRM_STATUSES as readonly string[]).includes(upper)) {
    return { value: upper as CrmStatus, confidence: 1.0 };
  }

  // ─── Deterministic keyword map ────────────────────────────────────────────
  const key = normalizeStatusKey(raw);
  if (key in STATUS_EXACT_MAP) {
    return { value: STATUS_EXACT_MAP[key], confidence: 0.95 };
  }

  // ─── Substring/pattern fallback ───────────────────────────────────────────
  if (/sale\s*done|closed|booked|converted|won|deal\s*done|token\s*done/.test(key)) {
    return { value: "SALE_DONE", confidence: 0.80 };
  }
  if (/bad\s*lead|not\s*interested|junk|spam|wrong\s*number|invalid\s*lead|fake\s*lead/.test(key)) {
    return { value: "BAD_LEAD", confidence: 0.80 };
  }
  if (/did\s*not\s*connect|dnc|not\s*reachable|no\s*answer|busy|switched\s*off|unreachable/.test(key)) {
    return { value: "DID_NOT_CONNECT", confidence: 0.80 };
  }
  if (/good\s*lead|follow\s*up|hot|interested|callback|call\s*back|warm|prospect/.test(key)) {
    return { value: "GOOD_LEAD_FOLLOW_UP", confidence: 0.80 };
  }

  // ─── No confident match ───────────────────────────────────────────────────
  return {
    value: "",
    confidence: 0,
    warning: `Unrecognized CRM status: "${raw.slice(0, 50)}"`,
  };
}

// ─── Data source normalization ────────────────────────────────────────────────

/** Normalize a source string for data_source lookup. */
function normalizeSourceKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s\-_]+/g, "") // strip all separators
    .trim();
}

/** Levenshtein distance for fuzzy matching. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Exact aliases for each data source. */
const SOURCE_ALIASES: Record<DataSource, string[]> = {
  leads_on_demand: ["leadsondemand", "lod", "leadondemand", "leadsondmand"],
  meridian_tower: ["meridiantower", "meridian"],
  eden_park: ["edenpark", "eden"],
  varah_swamy: ["varahswamy", "varah", "varahswamy"],
  sarjapur_plots: ["sarjapurplots", "sarjapur", "sarjapurplot", "sarjapurroad"],
};

/**
 * Map project/source nicknames → allowed data_source enum.
 * Returns structured result with confidence and original value.
 */
export function normalizeDataSource(value: unknown): DataSourceResult {
  if (typeof value !== "string") return { value: "", confidence: 0 };
  const raw = value.trim();
  if (!raw) return { value: "", confidence: 0 };

  // ─── Exact enum match ─────────────────────────────────────────────────────
  const lower = raw.toLowerCase().replace(/[\s\-]+/g, "_");
  if ((DATA_SOURCES as readonly string[]).includes(lower)) {
    return { value: lower as DataSource, confidence: 1.0 };
  }

  // ─── Normalized alias map ─────────────────────────────────────────────────
  const compact = normalizeSourceKey(raw);
  for (const [source, aliases] of Object.entries(SOURCE_ALIASES) as [DataSource, string[]][]) {
    if (aliases.includes(compact)) {
      return { value: source, confidence: 0.95, originalValue: raw };
    }
  }

  // ─── Controlled fuzzy matching (edit distance ≤ 2 for short strings) ──────
  const FUZZY_THRESHOLD = 2;
  let bestMatch: DataSource | null = null;
  let bestDist = Infinity;
  for (const [source, aliases] of Object.entries(SOURCE_ALIASES) as [DataSource, string[]][]) {
    for (const alias of aliases) {
      const dist = levenshtein(compact, alias);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = source;
      }
    }
  }

  if (bestMatch && bestDist <= FUZZY_THRESHOLD && compact.length >= 4) {
    return { value: bestMatch, confidence: Math.max(0.5, 1 - bestDist / 10), originalValue: raw };
  }

  // ─── No confident match ───────────────────────────────────────────────────
  return { value: "", confidence: 0, originalValue: raw };
}

// ─── Helpers retained for backward compatibility ──────────────────────────────

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

export function hasContactInfo(record: CrmLeadRecord): boolean {
  return Boolean(record.email.trim() || record.mobile_without_country_code.trim());
}

export function isValidCreatedAt(value: string): boolean {
  if (!value.trim()) return true;
  const result = normalizeCreatedAt(value);
  return result.isValid;
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

  const sourceResult = normalizeDataSource(raw.data_source);
  const dataSource = sourceResult.value;
  const rawSource = String(raw.data_source ?? "").trim();

  // If source didn't match an allowed enum, preserve original text in crm_note
  let existingNote = String(raw.crm_note ?? "").trim();
  if (rawSource && !dataSource) {
    const noteAppend = `Original source: ${rawSource}`;
    existingNote = existingNote
      ? `${existingNote} | ${noteAppend}`
      : noteAppend;
  }

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
    crm_status: normalizeCrmStatus(raw.crm_status).value,
    crm_note: textField(existingNote),
    data_source: dataSource,
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

  const dateResult = normalizeCreatedAt(record.created_at);
  record.created_at = dateResult.isValid ? dateResult.value : "";

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
