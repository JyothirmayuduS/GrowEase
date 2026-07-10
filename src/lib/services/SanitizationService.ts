/**
 * SanitizationService
 *
 * Deterministic HTML/script sanitization and CSV formula injection detection.
 * Does NOT mutate original_record values — only used for safe export and validation.
 */

// ─────────────────────────────────────────────
// Formula Injection Detection & Export Safety
// ─────────────────────────────────────────────

/**
 * Detect if a value resembles a spreadsheet formula injection attempt.
 * Checks for leading =, +, -, @ followed by letters (formula-like) or keywords.
 */
export function detectFormulaInjection(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Starts with formula prefix AND is followed by non-whitespace (not just punctuation usage)
  if (/^[=+\-@]/.test(trimmed)) {
    // Allow legitimate minus: -DROP TABLE is malicious; -12.5 is a number
    if (/^-\d+(\.\d+)?$/.test(trimmed)) return false;
    // Allow +91 style country codes (pure digit suffix)
    if (/^\+\d{1,4}$/.test(trimmed)) return false;
    // Everything else starting with these chars is suspicious
    return true;
  }

  return false;
}

/**
 * Escape a cell value for safe CSV export.
 * Prefix formula-like strings with a single quote so they render as text in Excel/Sheets.
 * Apply ONLY at export time — never mutate canonical data.
 */
export function escapeCsvFormulaForExport(value: string): string {
  if (detectFormulaInjection(value)) {
    return `'${value}`;
  }
  return value;
}

// ─────────────────────────────────────────────
// HTML / Script / Unsafe Content Detection
// ─────────────────────────────────────────────

/** Script and event-handler pattern detection. */
const SCRIPT_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /on(?:load|error|click|mouseover|focus|input|change|submit)\s*=/i,
  /<img[^>]+onerror/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

/** SQL injection keywords (only full-word matches). */
const SQL_PATTERNS = [
  /\b(DROP\s+TABLE|SELECT\s+\*\s+FROM|DELETE\s+FROM|INSERT\s+INTO|UNION\s+SELECT|exec\s*\(|xp_cmdshell)\b/i,
];

/** Shell command patterns. */
const SHELL_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bcurl\s+https?:\/\//i,
  /\bwget\s+https?:\/\//i,
  /\bsudo\b/i,
  /\bchmod\s+[0-9]/i,
];

export interface UnsafeContentResult {
  isUnsafe: boolean;
  hasHtml: boolean;
  hasScript: boolean;
  hasSql: boolean;
  hasShellCommand: boolean;
  strippedValue: string;
  warningCodes: string[];
}

/** Strip HTML tags from a string, returning plain text. */
export function stripHtmlTags(value: string): string {
  // Remove complete tags
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Full scan of a value for unsafe content. */
export function detectUnsafeContent(value: string): UnsafeContentResult {
  const warningCodes: string[] = [];

  const hasHtml = /<[a-z][^>]*>/i.test(value) || /&[a-z]+;/i.test(value);
  const hasScript = SCRIPT_PATTERNS.some((p) => p.test(value));
  const hasSql = SQL_PATTERNS.some((p) => p.test(value));
  const hasShellCommand = SHELL_PATTERNS.some((p) => p.test(value));

  if (hasScript) warningCodes.push("MALICIOUS_OR_UNSAFE_TEXT");
  if (hasSql) warningCodes.push("SQL_INJECTION_ATTEMPT");
  if (hasShellCommand) warningCodes.push("SHELL_INJECTION_ATTEMPT");
  if (hasHtml && !hasScript) warningCodes.push("HTML_CONTENT");

  const isUnsafe = hasScript || hasSql || hasShellCommand;
  const strippedValue = isUnsafe ? "" : hasHtml ? stripHtmlTags(value) : value;

  return {
    isUnsafe,
    hasHtml,
    hasScript,
    hasSql,
    hasShellCommand,
    strippedValue,
    warningCodes,
  };
}
