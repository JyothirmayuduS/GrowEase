import { AIProviderError, ErrorCodes } from "../../utils/errors";
import {
  columnMappingSchema,
  extractedRecordsSchema,
} from "../validation/validate-extracted";

export const COLUMN_PROMPT = `You map messy CRM CSV headers to GrowEasy fields.
Return ONLY JSON: {"mappings":[{"source_column":"...","target_field":"...","confidence":0-100,"status":"mapped|unmapped|ambiguous","ai_reason":"..."}]}
Target fields: created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description
Use "" for target_field when unsure. Do not invent columns.`;

export const EXTRACT_PROMPT = `Extract GrowEasy CRM leads from CSV rows.
Return ONLY JSON: {"records":[{...fields...,"confidence":0-100,"original_record":{...}}]}
Fields: created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description
crm_status must be one of GOOD_LEAD_FOLLOW_UP,DID_NOT_CONNECT,BAD_LEAD,SALE_DONE or "".
data_source must be one of leads_on_demand,meridian_tower,eden_park,varah_swamy,sarjapur_plots or "".
Use first valid email; put extras in crm_note. Use first valid mobile; put extras in crm_note.
created_at must be ISO-parseable or "". Do not invent missing values. Skip inventing contacts.`;

export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new AIProviderError("AI returned invalid JSON", ErrorCodes.AI_INVALID_RESPONSE);
  }
}

export function parseColumnMapping(raw: unknown) {
  const parsed = columnMappingSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AIProviderError(
      "AI column mapping failed validation",
      ErrorCodes.AI_INVALID_RESPONSE
    );
  }
  return parsed.data;
}

export function parseExtractedRecords(raw: unknown) {
  const parsed = extractedRecordsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AIProviderError("AI extraction failed validation", ErrorCodes.AI_INVALID_RESPONSE);
  }
  return {
    records: parsed.data.records.map((r) => ({
      ...r,
      crm_status: r.crm_status as never,
      data_source: r.data_source as never,
    })),
  };
}
