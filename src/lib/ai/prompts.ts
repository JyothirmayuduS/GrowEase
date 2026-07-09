import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES } from "@/lib/constants/crm";

export function buildSystemPrompt(): string {
  return `You are a CRM data extraction assistant for GrowEasy CRM.
Your job is to map arbitrary CSV row data into a fixed GrowEasy CRM lead schema.

CRM fields (return all keys, use empty string if unknown):
${CRM_FIELDS.join(", ")}

RULES — follow exactly:

1. crm_status — ONLY one of: ${CRM_STATUSES.join(" | ")}. Leave blank if uncertain.

2. data_source — ONLY one of: ${DATA_SOURCES.join(" | ")}. Leave blank if none match confidently.

3. created_at — Must be parseable by JavaScript new Date(). Use ISO or common date formats.

4. crm_note — Use for remarks, follow-up notes, extra comments, extra phone numbers, extra emails, or any info that does not fit other fields.

5. Multiple emails — Use the first as email. Append remaining emails to crm_note.

6. Multiple mobile numbers — Use the first as mobile_without_country_code (digits only, no country code in this field). Put country code in country_code (e.g. +91). Append extra numbers to crm_note.

7. Skip logic — Mark skip: true if the record has NEITHER a valid email NOR a valid mobile number. Otherwise skip: false.

8. Keep each record as a single logical row. Escape line breaks in text fields as \\n.

Return valid JSON only.`;
}

export function buildUserPrompt(
  headers: string[],
  rows: Record<string, string>[]
): string {
  return `CSV columns: ${JSON.stringify(headers)}

Map these ${rows.length} row(s) to GrowEasy CRM format:

${JSON.stringify(rows, null, 2)}

Return JSON:
{
  "records": [
    {
      "skip": false,
      "created_at": "",
      "name": "",
      "email": "",
      "country_code": "",
      "mobile_without_country_code": "",
      "company": "",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "",
      "crm_note": "",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ]
}`;
}
