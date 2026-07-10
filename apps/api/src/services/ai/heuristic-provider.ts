import {
  CRM_TARGET_FIELDS,
  type ColumnMapping,
  type ColumnMappingResult,
  type ExtractedLead,
  type ExtractedRecordResult,
} from "../../types/domain";
import {
  firstValidEmail,
  normalizeCrmStatus,
  normalizeDataSource,
  normalizePhone,
  parseCreatedAt,
  sanitizeNote,
} from "../validation/normalize";
import type { AIProvider, AnalyzeColumnsInput, ExtractRecordsInput } from "./types";

const SYNONYMS: Record<string, (typeof CRM_TARGET_FIELDS)[number]> = {
  name: "name",
  full_name: "name",
  contact_name: "name",
  email: "email",
  email_id: "email",
  phone: "mobile_without_country_code",
  mobile: "mobile_without_country_code",
  mobile_number: "mobile_without_country_code",
  company: "company",
  city: "city",
  state: "state",
  country: "country",
  owner: "lead_owner",
  lead_owner: "lead_owner",
  status: "crm_status",
  crm_status: "crm_status",
  notes: "crm_note",
  note: "crm_note",
  source: "data_source",
  data_source: "data_source",
  project: "data_source",
  created: "created_at",
  created_at: "created_at",
  possession: "possession_time",
  description: "description",
  country_code: "country_code",
};

export class HeuristicProvider implements AIProvider {
  async analyzeColumns(input: AnalyzeColumnsInput): Promise<ColumnMappingResult> {
    const used = new Set<string>();
    const mappings: ColumnMapping[] = input.headers.map((h) => {
      const key = h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      let target: ColumnMapping["target_field"] = (SYNONYMS[key] || "") as ColumnMapping["target_field"];
      if (target && used.has(target)) target = "";
      if (target) used.add(target);
      return {
        source_column: h,
        target_field: target,
        confidence: target ? 70 : 0,
        status: target ? ("mapped" as const) : ("unmapped" as const),
        ai_reason: target ? "heuristic synonym" : "no match",
      };
    });
    return { mappings };
  }

  async extractRecords(input: ExtractRecordsInput): Promise<ExtractedRecordResult> {
    const map = new Map(
      input.mappings
        .filter((m) => m.target_field)
        .map((m) => [m.source_column, m.target_field])
    );

    const records: ExtractedLead[] = input.rows.map((row, i) => {
      const get = (field: string) => {
        for (const [src, tgt] of map) {
          if (tgt === field) return row[src] || "";
        }
        return "";
      };
      const emailInfo = firstValidEmail(get("email") || Object.values(row).join(" "));
      const phoneInfo = normalizePhone(
        `${get("country_code")} ${get("mobile_without_country_code") || get("phone") || ""}`.trim() ||
          Object.values(row).join(" ")
      );
      let note = sanitizeNote(get("crm_note"));
      if (emailInfo.extras.length) note = sanitizeNote(`${note} Extra emails: ${emailInfo.extras.join(", ")}`);
      if (phoneInfo.extras.length) note = sanitizeNote(`${note} Extra phones: ${phoneInfo.extras.join(", ")}`);

      let nameVal = get("name");
      if (!nameVal) {
        const firstKey = Object.keys(row).find((k) => {
          const key = k.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
          return ["first_name", "firstname", "given_name", "first", "fname"].includes(key);
        });
        const lastKey = Object.keys(row).find((k) => {
          const key = k.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
          return ["last_name", "lastname", "surname", "family_name", "last", "lname"].includes(key);
        });
        const firstVal = firstKey ? (row[firstKey] || "").trim() : "";
        const lastVal = lastKey ? (row[lastKey] || "").trim() : "";
        if (firstVal || lastVal) {
          nameVal = [firstVal, lastVal].filter(Boolean).join(" ");
        }
      }

      const explicitCountryCode = get("country_code").trim();
      return {
        created_at: parseCreatedAt(get("created_at")),
        name: nameVal,
        email: emailInfo.primary,
        country_code: explicitCountryCode || phoneInfo.country_code,
        mobile_without_country_code: phoneInfo.mobile_without_country_code,
        company: get("company"),
        city: get("city"),
        state: get("state"),
        country: get("country"),
        lead_owner: get("lead_owner"),
        crm_status: normalizeCrmStatus(get("crm_status")),
        crm_note: note,
        data_source: normalizeDataSource(get("data_source")),
        possession_time: get("possession_time"),
        description: sanitizeNote(get("description")),
        confidence: 55,
        original_record: row,
        row_number: input.startRowNumber + i,
      };
    });

    return { records };
  }
}
