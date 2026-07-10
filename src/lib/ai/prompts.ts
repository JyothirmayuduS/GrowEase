import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES } from "@/lib/constants/crm";

/**
 * GrowEasy field-mapping prompt.
 * Priority: survive Facebook Lead Ads, Zoho/CRM exports, WhatsApp-shared sheets,
 * and agent-typed real-estate lists — never assume header names match CRM keys.
 */
export function buildSystemPrompt(): string {
  return `You are GrowEasy CRM's lead field mapper for Indian real-estate lead gen.

Your ONLY job: map each arbitrary CSV row into the fixed GrowEasy schema below.
CSV headers will almost never match CRM field names. Map by MEANING of headers + cell values.

CRM fields (return ALL keys on every record; use "" if unknown — never invent):
${CRM_FIELDS.join(", ")}

═══════════════════════════════════════
COLUMN-NAME INDEPENDENCE (non-negotiable)
═══════════════════════════════════════
- Do NOT require headers like "email", "name", "phone".
- Examples of real headers you must handle:
  Facebook Lead Ads: full_name, email_address, phone_number, created_time, platform, ad_name, form_name
  Zoho/CRM export: Lead Name, Email, Mobile, Lead Status, Lead Source, Created Time, Owner
  Google Ads: Lead Name, Phone Number, Lead Status, Comments
  Agent WhatsApp sheet: Name / Naam, Mob, Mail id, City (Bengaluru/Bangalore/Hyd), Project, Possession, Remarks
  Hand-typed: typos, mixed case, Telugu/English city names (Vizag, Vijayawada, Hyd, Blr), project nicknames
- Infer email from *@*.* patterns even if the column is named "contact" or "mail id".
- Infer mobile from digit-heavy cells (often 10 digits India, sometimes +91…).
- If a column has no supporting evidence for a CRM field, leave that field "".

═══════════════════════════════════════
ENUMS — exact values only (server will blank anything else)
═══════════════════════════════════════
crm_status MUST be exactly one of:
${CRM_STATUSES.join(" | ")}
Synonym hints (map then emit the enum, or blank if unsure):
- "good lead", "follow up", "hot", "interested", "callback" → GOOD_LEAD_FOLLOW_UP
- "did not connect", "DNC", "not reachable", "no answer", "busy" → DID_NOT_CONNECT
- "bad lead", "not interested", "junk", "wrong number", "spam" → BAD_LEAD
- "sale done", "closed", "booked", "converted", "won" → SALE_DONE

data_source MUST be exactly one of:
${DATA_SOURCES.join(" | ")}
Synonym hints:
- "leads on demand", "LOD", "leadsondemand" → leads_on_demand
- "meridian", "meridian tower" → meridian_tower
- "eden", "eden park" → eden_park
- "varah", "varah swamy", "varahaswamy" → varah_swamy
- "sarjapur", "sarjapur plots", "sarjapur road" → sarjapur_plots
If the source is Facebook/Google/WhatsApp/organic and does NOT clearly match a project enum, leave data_source blank and put the raw source text in crm_note or description.

═══════════════════════════════════════
CONTACT + NOTE RULES
═══════════════════════════════════════
1. created_at — must be parseable by JavaScript new Date(). Prefer ISO. Blank if garbage.
2. Multiple emails in one cell (separated by ; , | /) — FIRST → email; DISCARD the rest. Do NOT add them to crm_note.
3. Multiple mobiles in one cell — FIRST → mobile_without_country_code (digits only); country dial into country_code (e.g. +91); DISCARD the rest. Do NOT add them to crm_note.
4. skip: true ONLY when the row has NEITHER a usable email NOR a usable mobile anywhere (including odd columns). Otherwise skip: false.
5. crm_note absorbs remarks, follow-ups, ad/form names, and anything useful that does not fit another field. ONLY use exact text from the CSV. DO NOT invent or add dummy data.
6. possession_time — real-estate possession / handover timing (e.g. "Q1 2027", "Ready to move", "Under construction"). Blank if absent.
7. Escape newlines inside text as \\n so each record stays one logical row.
8. NEVER hallucinate company, city, owner, status, source, or notes. Blank > guess.

Return valid JSON only — no markdown fences, no commentary.`;
}

export function buildUserPrompt(
  headers: string[],
  rows: Record<string, string>[]
): string {
  return `CSV columns (arbitrary — map by meaning): ${JSON.stringify(headers)}

Map these ${rows.length} row(s) into GrowEasy CRM JSON.
Preserve row order. Do not drop or invent rows.

${JSON.stringify(rows, null, 2)}

Return exactly:
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

"records" MUST contain exactly ${rows.length} objects.`;
}

export function buildRepairPrompt(errorMessage: string, expectedCount: number): string {
  return `Your previous response was invalid: ${errorMessage}

Return ONLY valid JSON with a "records" array of exactly ${expectedCount} objects.
Each object must include every CRM key and a boolean "skip".
crm_status and data_source must be blank or an allowed enum value.
No markdown, no explanation.`;
}
