/**
 * Three-state row quality model (Phase 2)
 * clean | needs_review | skipped
 *
 * Used at Preview (raw CSV) and Results (mapped CRM records).
 * Flags are dual-coded in UI (icon + text label) — never color alone.
 */

export type RowState = "clean" | "needs_review" | "skipped";

export interface CellFlag {
  header: string;
  label: string; // human-readable, shown next to icon
  kind: "ambiguous" | "malformed" | "missing" | "empty_row" | "duplicate";
}

export interface RowAssessment {
  state: RowState;
  flags: CellFlag[];
  /** Short sentence for screen readers / tooltips */
  summary: string;
}

export interface QualitySummary {
  clean: number;
  needsReview: number;
  skipped: number;
  total: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Intentional multi-value separators — not comma (prose/addresses) or bare slash in dates. */
const MULTI_SEP_RE = /[;|]/;

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isEmailHeader(h: string): boolean {
  const n = normalizeHeader(h);
  return n.includes("email") || n === "mail" || n === "e_mail";
}

function isPhoneHeader(h: string): boolean {
  const n = normalizeHeader(h);
  // Intentionally excludes generic "contact" / "contactname" so name columns
  // are not treated as phones (that was producing orphan "Needs review" rows).
  return (
    n.includes("phone") ||
    n.includes("mobile") ||
    n === "tel" ||
    n.includes("altphone") ||
    n === "cell" ||
    n === "cellphone"
  );
}

function isNameHeader(h: string): boolean {
  const n = normalizeHeader(h);
  return n === "name" || n === "fullname" || n.includes("fullname") || n === "contactname";
}

function hasMultipleValues(value: string): boolean {
  if (!MULTI_SEP_RE.test(value)) return false;
  const parts = value.split(MULTI_SEP_RE).map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2;
}

function isRowEmpty(row: Record<string, string>, headers: string[]): boolean {
  return headers.every((h) => !(row[h] ?? "").trim());
}

function rowFingerprint(row: Record<string, string>, headers: string[]): string {
  return headers.map((h) => (row[h] ?? "").trim().toLowerCase()).join("\u0001");
}

/** Assess a raw CSV preview row before AI mapping. */
export function assessPreviewRow(
  row: Record<string, string>,
  headers: string[],
  options?: { duplicate?: boolean }
): RowAssessment {
  const flags: CellFlag[] = [];

  if (isRowEmpty(row, headers)) {
    return {
      state: "skipped",
      flags: [{ header: "", label: "Empty row", kind: "empty_row" }],
      summary: "Skipped: empty row",
    };
  }

  if (options?.duplicate) {
    return {
      state: "skipped",
      flags: [{ header: "", label: "Duplicate row", kind: "duplicate" }],
      summary: "Skipped: duplicate of an earlier row",
    };
  }

  for (const header of headers) {
    const value = (row[header] ?? "").trim();
    if (!value) continue;

    // Multi-value ambiguity only on contact fields — notes/dates/addresses with
    // commas or slashes must not produce orphan "Multiple values" flags.
    if (isEmailHeader(header) && hasMultipleValues(value)) {
      flags.push({ header, label: "Multiple emails", kind: "ambiguous" });
      continue;
    }
    if (isPhoneHeader(header) && hasMultipleValues(value)) {
      flags.push({ header, label: "Multiple phones", kind: "ambiguous" });
      continue;
    }

    if (isEmailHeader(header) && !EMAIL_RE.test(value)) {
      flags.push({ header, label: "Malformed email", kind: "malformed" });
    }

    if (isPhoneHeader(header)) {
      const digits = value.replace(/\D/g, "");
      if (digits.length > 0 && (digits.length < 8 || digits.length > 15)) {
        flags.push({ header, label: "Suspicious phone", kind: "malformed" });
      }
    }
  }

  const nameHeader = headers.find((h) => isNameHeader(h));
  const emailHeader = headers.find((h) => isEmailHeader(h));
  const phoneHeader = headers.find((h) => isPhoneHeader(h));

  const hasName = Boolean(nameHeader && (row[nameHeader] ?? "").trim());
  const hasEmail = Boolean(emailHeader && (row[emailHeader] ?? "").trim());
  const hasPhone = headers.some((h) => isPhoneHeader(h) && (row[h] ?? "").trim());

  if (nameHeader && !hasName) {
    // Bind to the real CSV column so the Preview table can render an inline tag.
    flags.push({ header: nameHeader, label: "Missing name", kind: "missing" });
  } else if (!nameHeader && !hasName) {
    // No name-like column in the file — reason must surface on the Status cell.
    flags.push({ header: "", label: "Missing name", kind: "missing" });
  }

  if (!hasEmail && !hasPhone) {
    // Prefer attaching to an email column, else primary phone column, else Status.
    flags.push({
      header: emailHeader ?? phoneHeader ?? "",
      label: "No email or phone",
      kind: "missing",
    });
  }

  if (flags.length === 0) {
    return { state: "clean", flags: [], summary: "Clean: no issues detected" };
  }

  return {
    state: "needs_review",
    flags,
    summary: `Needs review: ${flags.map((f) => f.label.toLowerCase()).join(", ")}`,
  };
}

/** Assess all preview rows; marks duplicates after the first occurrence. */
export function assessPreviewRows(
  headers: string[],
  rows: Record<string, string>[]
): RowAssessment[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    if (isRowEmpty(row, headers)) {
      return assessPreviewRow(row, headers);
    }
    const fp = rowFingerprint(row, headers);
    const prior = seen.get(fp);
    if (prior !== undefined) {
      return assessPreviewRow(row, headers, { duplicate: true });
    }
    seen.set(fp, 1);
    return assessPreviewRow(row, headers);
  });
}

export function summarizeAssessments(assessments: RowAssessment[]): QualitySummary {
  const summary: QualitySummary = {
    clean: 0,
    needsReview: 0,
    skipped: 0,
    total: assessments.length,
  };
  for (const a of assessments) {
    if (a.state === "clean") summary.clean += 1;
    else if (a.state === "needs_review") summary.needsReview += 1;
    else summary.skipped += 1;
  }
  return summary;
}

/** Map CRM record quality into the same three-state model. */
export function crmRecordToRowState(opts: {
  flagged: boolean;
  skipped?: boolean;
}): RowState {
  if (opts.skipped) return "skipped";
  if (opts.flagged) return "needs_review";
  return "clean";
}
