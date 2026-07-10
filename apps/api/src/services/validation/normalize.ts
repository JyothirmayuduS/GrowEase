import { CRM_STATUSES, DATA_SOURCES, type CrmStatus, type DataSource } from "../../types/domain";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeNull(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function sanitizeNote(value: string): string {
  return normalizeNull(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .slice(0, 4000);
}

export function isValidEmail(email: string): boolean {
  const e = normalizeNull(email);
  if (!e || e.length > 254) return false;
  return EMAIL_RE.test(e);
}

export function firstValidEmail(raw: string): { primary: string; extras: string[] } {
  const parts = normalizeNull(raw)
    .split(/[;,|/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = parts.filter(isValidEmail);
  return { primary: valid[0] ?? "", extras: valid.slice(1) };
}

export function normalizePhone(raw: string): {
  country_code: string;
  mobile_without_country_code: string;
  extras: string[];
} {
  const chunks = normalizeNull(raw)
    .split(/[;,|/]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = chunks
    .map((chunk) => {
      const digits = chunk.replace(/[^\d+]/g, "");
      const only = digits.replace(/\D/g, "");
      if (only.length < 8) return null;
      if (digits.startsWith("+") && only.length >= 10) {
        // naive: last 10 as local for IN-style, rest country
        const local = only.slice(-10);
        const cc = only.slice(0, only.length - 10);
        return {
          country_code: cc ? `+${cc}` : "+91",
          mobile_without_country_code: local,
        };
      }
      if (only.length === 10) {
        return { country_code: "+91", mobile_without_country_code: only };
      }
      if (only.length === 12 && only.startsWith("91")) {
        return { country_code: "+91", mobile_without_country_code: only.slice(2) };
      }
      return {
        country_code: "",
        mobile_without_country_code: only,
      };
    })
    .filter(Boolean) as Array<{ country_code: string; mobile_without_country_code: string }>;

  const primary = parsed[0] ?? { country_code: "", mobile_without_country_code: "" };
  const extras = parsed.slice(1).map((p) => `${p.country_code}${p.mobile_without_country_code}`);
  return { ...primary, extras };
}

export function parseCreatedAt(raw: string): string {
  const v = normalizeNull(raw);
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function normalizeCrmStatus(raw: string): CrmStatus | "" {
  const v = normalizeNull(raw).toUpperCase().replace(/[\s-]+/g, "_");
  if ((CRM_STATUSES as readonly string[]).includes(v)) return v as CrmStatus;
  if (/good|follow/.test(v.toLowerCase())) return "GOOD_LEAD_FOLLOW_UP";
  if (/dnc|did.?not.?connect|no.?answer|busy/.test(v.toLowerCase())) return "DID_NOT_CONNECT";
  if (/bad|junk|invalid/.test(v.toLowerCase())) return "BAD_LEAD";
  if (/sale|closed|booked|token/.test(v.toLowerCase())) return "SALE_DONE";
  return "";
}

export function normalizeDataSource(raw: string): DataSource | "" {
  const v = normalizeNull(raw).toLowerCase().replace(/[\s-]+/g, "_");
  if ((DATA_SOURCES as readonly string[]).includes(v)) return v as DataSource;
  if (/lod|leads.?on.?demand/.test(v)) return "leads_on_demand";
  if (/meridian/.test(v)) return "meridian_tower";
  if (/eden/.test(v)) return "eden_park";
  if (/varah/.test(v)) return "varah_swamy";
  if (/sarjapur/.test(v)) return "sarjapur_plots";
  return "";
}

export function truncateField(value: string, max = 500): string {
  return normalizeNull(value).slice(0, max);
}

/** Prefix formula-injection-prone CSV cells. */
export function csvSafeCell(value: string): string {
  const v = value ?? "";
  if (/^[=+\-@]/.test(v)) return `'${v}`;
  return v;
}

export function rowFingerprint(row: Record<string, string>): string {
  return Object.keys(row)
    .sort()
    .map((k) => `${k}=${normalizeNull(row[k]).toLowerCase()}`)
    .join("|");
}
