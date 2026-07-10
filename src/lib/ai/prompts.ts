import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES } from "@/lib/constants/crm";

export function buildSystemPrompt(): string {
  return `You are a CRM data extraction assistant for GrowEasy CRM.
Your job is to map arbitrary CSV row data into a fixed GrowEasy CRM lead schema.

CRITICAL — column-name independence:
- CSV headers will NOT match CRM field names. Do not assume headers like "email" or "name".
- Infer meaning from header labels AND cell values (e.g. a column of *@*.* values is email).
- Never invent values that are not present or clearly implied in the row.
- If a field has no supporting data in the row, return an empty string for that field.

CRM fields (return ALL keys on every record; use "" if unknown):
${CRM_FIELDS.join(", ")}

RULES — follow exactly:

1. crm_status — ONLY one of: ${CRM_STATUSES.join(" | ")}. Leave blank if uncertain. Never invent a status.

2. data_source — ONLY one of: ${DATA_SOURCES.join(" | ")}. Leave blank if none match confidently.

3. created_at — Must be parseable by JavaScript new Date(). Prefer ISO. Leave blank if unparseable.

4. crm_note — Remarks, follow-up notes, extra comments, extra phone numbers, extra emails, or any useful info that does not fit other fields.

5. Multiple emails — Use the FIRST as email. Append remaining emails into crm_note (e.g. "Extra emails: a@b.com, c@d.com").

6. Multiple mobile numbers — Use the FIRST as mobile_without_country_code (digits only). Put country code in country_code (e.g. +91). Append extra numbers into crm_note.

7. Skip logic — Set skip: true ONLY if the row has NEITHER a usable email NOR a usable mobile anywhere. Otherwise skip: false.

8. Escape line breaks inside text fields as \\n so each record stays one logical row.

9. Do not hallucinate company, city, owner, or other fields when the CSV has no such data.

Return valid JSON only — no markdown fences, no commentary.`;
}

export function buildUserPrompt(
  headers: string[],
  rows: Record<string, string>[]
): string {
  return `CSV columns (arbitrary names — map by meaning, not by exact label): ${JSON.stringify(headers)}

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
}

The "records" array MUST have exactly ${rows.length} items, in the same order as the input rows.`;
}

/** Corrective follow-up when the first AI response fails schema validation. */
export function buildRepairPrompt(errorMessage: string, expectedCount: number): string {
  return `Your previous response was invalid: ${errorMessage}

Return ONLY valid JSON with a "records" array of exactly ${expectedCount} objects.
Each object must include all CRM keys listed earlier and a boolean "skip".
No markdown, no explanation.`;
}
