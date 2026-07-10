/**
 * HybridRowProcessor
 *
 * Orchestrates the full deterministic + AI validation pipeline for a single row:
 * 1. Preserve original_record
 * 2. Extract emails (row-wide scan)
 * 3. Extract phones (row-wide scan)
 * 4. Validate name (formula/script/garbage detection)
 * 5. Apply safe-text sanitization to all fields
 * 6. Build structured CRM note
 * 7. Return a CrmLeadRecord + warnings
 *
 * This module is used by extract-batch.ts before/after AI mapping.
 */

import type { CrmLeadRecord } from "@/lib/types/crm";
import { normalizeCrmStatus, normalizeDataSource } from "@/lib/validation/crm-record";
import { escapeNewlines } from "@/lib/validation/contact-fields";
import { extractEmailsFromRow } from "@/lib/services/EmailExtractionService";
import { extractPhonesFromRow } from "@/lib/services/PhoneExtractionService";
import { validatePersonName } from "@/lib/services/NameValidationService";
import { detectFormulaInjection, detectUnsafeContent } from "@/lib/services/SanitizationService";
import { buildCrmNote } from "@/lib/services/CRMNoteBuilder";
import type { ProcessingWarning } from "@/lib/services/RecordClassificationService";

export interface HybridProcessingResult {
  record: CrmLeadRecord;
  warnings: ProcessingWarning[];
}

/**
 * Safely sanitize a plain-text field (not name — use validatePersonName for that).
 * Returns the sanitized value and any warnings.
 */
function sanitizePlainTextField(
  value: string,
  fieldName: string,
  warnings: ProcessingWarning[]
): string {
  if (!value.trim()) return "";

  // Formula injection check
  if (detectFormulaInjection(value)) {
    // Prefix with apostrophe to neutralize — we preserve the data but mark it
    warnings.push({
      code: "POTENTIAL_CSV_FORMULA",
      field: fieldName,
      message: `Value looks like a spreadsheet formula: ${value.slice(0, 30)}`,
      severity: "warning",
    });
    // Return the neutralized version
    return `'${value.trim()}`;
  }

  // Unsafe content check
  const unsafe = detectUnsafeContent(value);
  if (unsafe.isUnsafe) {
    warnings.push({
      code: "MALICIOUS_OR_UNSAFE_TEXT",
      field: fieldName,
      message: `Unsafe content detected in field "${fieldName}"`,
      severity: "error",
    });
    return ""; // Clear unsafe data
  }

  // Strip HTML for HTML-containing (but non-malicious) fields
  if (unsafe.hasHtml) {
    return escapeNewlines(unsafe.strippedValue.trim());
  }

  return escapeNewlines(value.trim());
}

/**
 * Process a single CRM record produced by AI/heuristic extraction,
 * applying deterministic validation and enrichment.
 *
 * @param aiRecord - the AI/heuristic output (may have wrong emails/phones)
 * @param rawRow - the original unmodified CSV row for row-wide scanning
 */
export function hybridProcessRecord(
  aiRecord: Partial<CrmLeadRecord>,
  rawRow: Record<string, string>
): HybridProcessingResult {
  const warnings: ProcessingWarning[] = [];
  const noteRemarks: string[] = [];
  const noteExtraEmails: string[] = [];
  const noteExtraPhones: string[] = [];
  let inferredCountryCode = "";

  // ─── STEP 1: Extract emails (row-wide) ───────────────────────────────────
  const emailResult = extractEmailsFromRow(rawRow);
  const primaryEmail = emailResult.primaryEmail;
  if (emailResult.extraEmails.length > 0) {
    noteExtraEmails.push(...emailResult.extraEmails);
  }
  if (!primaryEmail && emailResult.invalidEmailCandidates.length > 0) {
    warnings.push({
      code: "INVALID_EMAIL",
      field: "email",
      message: `Invalid email candidates found: ${emailResult.invalidEmailCandidates.slice(0, 2).join(", ")}`,
      severity: "warning",
    });
  }

  // ─── STEP 2: Extract phones (row-wide) ───────────────────────────────────
  // Use country from AI record for inference
  const countryContext = String(aiRecord.country ?? aiRecord.country_code ?? "").trim();
  const phoneResult = extractPhonesFromRow(rawRow, countryContext);
  const primaryPhone = phoneResult.primaryPhone;
  inferredCountryCode = phoneResult.inferredCountryCode;

  if (phoneResult.extraPhones.length > 0) {
    noteExtraPhones.push(...phoneResult.extraPhones);
  }

  // Warn if country code was inferred
  if (primaryPhone && !primaryPhone.countryCode && inferredCountryCode) {
    warnings.push({
      code: "INFERRED_COUNTRY_CODE",
      field: "country_code",
      message: `Country code inferred as ${inferredCountryCode} from country context`,
      severity: "info",
    });
  }

  // ─── STEP 3: Validate name ───────────────────────────────────────────────
  const rawName = String(aiRecord.name ?? "").trim();
  const nameResult = validatePersonName(rawName);
  let validatedName = "";

  if (rawName && !nameResult.isValid) {
    warnings.push({
      code: nameResult.reasonCode,
      field: "name",
      message: `Invalid name rejected: "${rawName.slice(0, 40)}" — ${nameResult.reasonCode}`,
      severity: nameResult.severity === "ok" ? "info" : nameResult.severity,
    });
  } else if (nameResult.isValid) {
    validatedName = nameResult.normalizedValue;
  }

  // ─── STEP 4: Sanitize plain-text fields ──────────────────────────────────
  const company = sanitizePlainTextField(String(aiRecord.company ?? ""), "company", warnings);
  const city = sanitizePlainTextField(String(aiRecord.city ?? ""), "city", warnings);
  const state = sanitizePlainTextField(String(aiRecord.state ?? ""), "state", warnings);
  const country = sanitizePlainTextField(String(aiRecord.country ?? ""), "country", warnings);
  const leadOwner = sanitizePlainTextField(String(aiRecord.lead_owner ?? ""), "lead_owner", warnings);
  const possessionTime = sanitizePlainTextField(String(aiRecord.possession_time ?? ""), "possession_time", warnings);
  const description = sanitizePlainTextField(String(aiRecord.description ?? ""), "description", warnings);

  // ─── STEP 5: Normalize enums ─────────────────────────────────────────────
  const crmStatus = normalizeCrmStatus(aiRecord.crm_status);
  const dataSource = normalizeDataSource(aiRecord.data_source);

  // If data_source doesn't match an allowed enum, preserve it in crm_note
  const rawSource = String(aiRecord.data_source ?? "").trim();
  if (rawSource && !dataSource) {
    // Only add to note if it's safe
    const safeSource = detectUnsafeContent(rawSource);
    if (!safeSource.isUnsafe) {
      // Will be added via buildCrmNote below
    }
  }

  // ─── STEP 6: Date validation ─────────────────────────────────────────────
  let createdAt = String(aiRecord.created_at ?? "").trim();
  if (createdAt) {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) {
      warnings.push({
        code: "INVALID_DATE",
        field: "created_at",
        message: `Invalid date value: "${createdAt}"`,
        severity: "warning",
      });
      createdAt = "";
    }
  }

  // ─── STEP 7: Build CRM note ──────────────────────────────────────────────
  const existingNote = String(aiRecord.crm_note ?? "").trim();
  if (existingNote) noteRemarks.push(existingNote);

  const crmNote = buildCrmNote({
    remarks: noteRemarks,
    extraEmails: noteExtraEmails,
    extraPhones: noteExtraPhones,
    originalSource: rawSource && !dataSource ? rawSource : undefined,
  });

  // ─── STEP 8: Assemble record ─────────────────────────────────────────────
  const record: CrmLeadRecord = {
    created_at: createdAt,
    name: validatedName,
    email: primaryEmail,
    country_code: primaryPhone?.countryCode || inferredCountryCode || String(aiRecord.country_code ?? "").trim(),
    mobile_without_country_code: primaryPhone?.number ?? "",
    company,
    city,
    state,
    country,
    lead_owner: leadOwner,
    crm_status: crmStatus,
    crm_note: crmNote,
    data_source: dataSource,
    possession_time: possessionTime,
    description,
  };

  return { record, warnings };
}
