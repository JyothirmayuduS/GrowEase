import { z } from "zod";

import {
  CRM_STATUSES,
  CRM_TARGET_FIELDS,
  DATA_SOURCES,
  type ExtractedLead,
} from "../../types/domain";
import {
  firstValidEmail,
  normalizeCrmStatus,
  normalizeDataSource,
  normalizeNull,
  normalizePhone,
  parseCreatedAt,
  rowFingerprint,
  sanitizeNote,
  truncateField,
} from "./normalize";

export const columnMappingSchema = z.object({
  mappings: z.array(
    z.object({
      source_column: z.string(),
      target_field: z.union([z.enum(CRM_TARGET_FIELDS), z.literal("")]),
      confidence: z.number().min(0).max(100),
      status: z.enum(["mapped", "unmapped", "ambiguous"]),
      ai_reason: z.string(),
    })
  ),
});

export const extractedRecordsSchema = z.object({
  records: z.array(
    z.object({
      created_at: z.string().optional().default(""),
      name: z.string().optional().default(""),
      email: z.string().optional().default(""),
      country_code: z.string().optional().default(""),
      mobile_without_country_code: z.string().optional().default(""),
      company: z.string().optional().default(""),
      city: z.string().optional().default(""),
      state: z.string().optional().default(""),
      country: z.string().optional().default(""),
      lead_owner: z.string().optional().default(""),
      crm_status: z.string().optional().default(""),
      crm_note: z.string().optional().default(""),
      data_source: z.string().optional().default(""),
      possession_time: z.string().optional().default(""),
      description: z.string().optional().default(""),
      confidence: z.number().min(0).max(100).optional().default(0),
      original_record: z.record(z.string()).optional().default({}),
      row_number: z.number().optional(),
    })
  ),
});

export interface ValidatedBatchResult {
  leads: ExtractedLead[];
  skipped: ExtractedLead[];
}

export function validateExtractedBatch(
  records: ExtractedLead[],
  seenEmails: Set<string>,
  seenPhones: Set<string>,
  seenRows: Set<string>
): ValidatedBatchResult {
  const leads: ExtractedLead[] = [];
  const skipped: ExtractedLead[] = [];

  for (const raw of records) {
    const errors: string[] = [];
    const emails = firstValidEmail(raw.email || "");
    const phones = normalizePhone(
      [raw.country_code, raw.mobile_without_country_code].filter(Boolean).join(" ") ||
        String((raw as { mobile?: string }).mobile || "")
    );

    // Also parse email/phone from original if AI left blanks
    if (!emails.primary && raw.original_record) {
      const joined = Object.values(raw.original_record).join(" ");
      const fromOrig = firstValidEmail(joined);
      if (fromOrig.primary) {
        emails.primary = fromOrig.primary;
        emails.extras.push(...fromOrig.extras);
      }
    }

    let note = sanitizeNote(raw.crm_note || "");
    if (emails.extras.length) {
      note = sanitizeNote(`${note} Extra emails: ${emails.extras.join(", ")}`.trim());
    }
    if (phones.extras.length) {
      note = sanitizeNote(`${note} Extra phones: ${phones.extras.join(", ")}`.trim());
    }

    const status = normalizeCrmStatus(raw.crm_status || "");
    if (raw.crm_status && !status && !CRM_STATUSES.includes(raw.crm_status as never)) {
      // keep empty rather than invent
    }
    const dataSource = normalizeDataSource(raw.data_source || "");
    if (raw.data_source && !dataSource && !(DATA_SOURCES as readonly string[]).includes(raw.data_source)) {
      // empty string per rules
    }

    const created = parseCreatedAt(raw.created_at || "");
    if (raw.created_at && !created) errors.push("INVALID_DATE");

    if (!emails.primary && !phones.mobile_without_country_code) {
      skipped.push({
        ...emptyLead(raw),
        skip: true,
        skip_reason: "MISSING_CONTACT",
        validation_errors: ["MISSING_CONTACT"],
        original_record: raw.original_record || {},
        row_number: raw.row_number,
        confidence: raw.confidence || 0,
      });
      continue;
    }

    if (emails.primary) {
      const key = emails.primary.toLowerCase();
      if (seenEmails.has(key)) errors.push("DUPLICATE_EMAIL");
      else seenEmails.add(key);
    }
    if (phones.mobile_without_country_code) {
      const key = `${phones.country_code}:${phones.mobile_without_country_code}`;
      if (seenPhones.has(key)) errors.push("DUPLICATE_PHONE");
      else seenPhones.add(key);
    }

    const fp = rowFingerprint(raw.original_record || {});
    if (fp && seenRows.has(fp)) errors.push("DUPLICATE_ROW");
    else if (fp) seenRows.add(fp);

    const lead: ExtractedLead = {
      created_at: created,
      name: truncateField(raw.name || "", 200),
      email: emails.primary,
      country_code: phones.country_code,
      mobile_without_country_code: phones.mobile_without_country_code,
      company: truncateField(raw.company || "", 200),
      city: truncateField(raw.city || "", 100),
      state: truncateField(raw.state || "", 100),
      country: truncateField(raw.country || "", 100),
      lead_owner: truncateField(raw.lead_owner || "", 200),
      crm_status: status,
      crm_note: note,
      data_source: dataSource,
      possession_time: truncateField(raw.possession_time || "", 100),
      description: sanitizeNote(raw.description || ""),
      confidence: Math.max(0, Math.min(100, Number(raw.confidence) || 0)),
      original_record: raw.original_record || {},
      row_number: raw.row_number,
    };

    if (errors.length) {
      skipped.push({
        ...lead,
        skip: true,
        skip_reason: errors[0],
        validation_errors: errors,
      });
    } else {
      leads.push(lead);
    }
  }

  return { leads, skipped };
}

function emptyLead(raw: ExtractedLead): ExtractedLead {
  return {
    created_at: "",
    name: normalizeNull(raw.name),
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
    confidence: raw.confidence || 0,
    original_record: raw.original_record || {},
  };
}
