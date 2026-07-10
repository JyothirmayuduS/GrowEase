/**
 * NameValidationService
 *
 * Deterministic person-name validation.
 * Permits: Unicode letters, spaces, apostrophes, hyphens, periods, initials,
 *          accented chars, Indian/Arabic/Asian names, emojis mixed with real text.
 * Rejects: formulas, scripts, SQL, shell commands, repeated-char garbage, URLs,
 *          mostly digits/symbols, placeholder values, excessively long strings.
 */

import { analyzeTextQuality } from "@/lib/services/TextQualityService";
import { detectFormulaInjection, detectUnsafeContent } from "@/lib/services/SanitizationService";

export type NameValidationSeverity = "ok" | "warning" | "error";

export interface NameValidationResult {
  normalizedValue: string;
  isValid: boolean;
  severity: NameValidationSeverity;
  reasonCode: string;
  confidence: number;
}

// ─────────────────────────────────────────────
// Placeholder / dummy name detection
// ─────────────────────────────────────────────

/**
 * Exact placeholder names that should always be rejected.
 * Carefully chosen to NOT reject real names like "Testa" or "Null Sharma".
 */
const EXACT_PLACEHOLDERS = new Set([
  "test",
  "testing",
  "unknown",
  "null",
  "undefined",
  "n/a",
  "na",
  "none",
  "dummy",
  "asdf",
  "qwerty",
  "xyz",
  "sample",
  "no name",
  "noname",
  "anonymous",
  "temp",
  "placeholder",
  "admin",
  "user",
  "guest",
  "demo",
  "xxx",
  "yyy",
  "zzz",
  "aaa",
  "bbb",
  "ccc",
]);

// ─────────────────────────────────────────────
// URL / email in name field
// ─────────────────────────────────────────────

const URL_RE = /^https?:\/\//i;
const EMAIL_IN_NAME_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────
// Emoji stripping: remove emojis from a string, keep rest
// ─────────────────────────────────────────────

const EMOJI_RE =
  /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{1F004}]/gu;

function stripEmojis(value: string): string {
  return value.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

function hasEmojis(value: string): boolean {
  return EMOJI_RE.test(value);
}

// ─────────────────────────────────────────────
// Main validation function
// ─────────────────────────────────────────────

export function validatePersonName(value: string): NameValidationResult {
  const trimmed = value.trim();

  // 1. Empty
  if (!trimmed) {
    return { normalizedValue: "", isValid: false, severity: "error", reasonCode: "EMPTY_NAME", confidence: 0 };
  }

  // 2. Too long
  if (trimmed.length > 150) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "error",
      reasonCode: "INVALID_NAME",
      confidence: 0,
    };
  }

  // 3. Formula injection (=SUM, +SUM, -DROP, @SUM)
  if (detectFormulaInjection(trimmed)) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "error",
      reasonCode: "POTENTIAL_CSV_FORMULA",
      confidence: 0,
    };
  }

  // 4. Unsafe content: scripts, SQL, shell commands
  const unsafeCheck = detectUnsafeContent(trimmed);
  if (unsafeCheck.isUnsafe) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "error",
      reasonCode: "MALICIOUS_OR_UNSAFE_TEXT",
      confidence: 0,
    };
  }

  // 5. URL
  if (URL_RE.test(trimmed)) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "error",
      reasonCode: "INVALID_NAME",
      confidence: 0,
    };
  }

  // 6. Email address in name field
  if (EMAIL_IN_NAME_RE.test(trimmed)) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "error",
      reasonCode: "INVALID_NAME",
      confidence: 0,
    };
  }

  // 7. Exact placeholder check (only for short strings to not reject "None Sharma")
  const lowerCompact = trimmed.toLowerCase().replace(/\s+/g, " ").trim();
  if (EXACT_PLACEHOLDERS.has(lowerCompact)) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "warning",
      reasonCode: "SUSPICIOUS_NAME",
      confidence: 0,
    };
  }

  // 8. Check for emojis — strip them and validate what remains
  const hasEmojiChars = hasEmojis(trimmed);
  const nameWithoutEmoji = hasEmojiChars ? stripEmojis(trimmed) : trimmed;

  // If stripping emojis leaves nothing (purely emoji name)
  if (!nameWithoutEmoji) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "warning",
      reasonCode: "INVALID_NAME",
      confidence: 0,
    };
  }

  // 9. Analyze text quality (strict mode for names)
  const quality = analyzeTextQuality(nameWithoutEmoji, true);
  if (!quality.isMeaningful) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "warning",
      reasonCode: "INVALID_NAME",
      confidence: 0,
    };
  }

  // 10. Must have at least some alphabetic content
  const alphaRatio = quality.alphabeticRatio;
  if (alphaRatio < 0.3 && nameWithoutEmoji.length > 4) {
    return {
      normalizedValue: "",
      isValid: false,
      severity: "warning",
      reasonCode: "INVALID_NAME",
      confidence: 0,
    };
  }

  // 11. Single character names — only allow initials style (e.g., "A")
  // Allow if it's 1 char or initials like "A." — reject only if we're in strict context
  if (nameWithoutEmoji.replace(/[^a-zA-Z\u00C0-\u024F\u0900-\u097F]/gu, "").length < 2) {
    // Allow a single letter initial if it's just that
    if (nameWithoutEmoji.length <= 2) {
      // Acceptable: "A", "A."
    } else {
      return {
        normalizedValue: "",
        isValid: false,
        severity: "warning",
        reasonCode: "INVALID_NAME",
        confidence: 0,
      };
    }
  }

  // ✅ Valid name — normalize whitespace
  const normalized = nameWithoutEmoji.replace(/\s+/g, " ").trim();
  const confidence = Math.min(1, 0.7 + alphaRatio * 0.3);

  return {
    normalizedValue: normalized,
    isValid: true,
    severity: "ok",
    reasonCode: "OK",
    confidence,
  };
}
