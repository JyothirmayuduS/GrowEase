/**
 * CRMNoteBuilder
 *
 * Structured CRM note construction. Prevents duplicate content, unsafe payloads,
 * and keeps notes as single-line human-readable text.
 */

import { detectUnsafeContent } from "@/lib/services/SanitizationService";

const SECTION_SEPARATOR = " | ";
const MAX_NOTE_LENGTH = 1000;

export class CRMNoteBuilder {
  private sections: string[] = [];

  /** Add a general remark or note (e.g., from a "remarks" column). */
  addRemark(value: string): this {
    return this.addSection(value);
  }

  /** Add a follow-up note. */
  addFollowUp(value: string): this {
    return this.addSection(value);
  }

  /** Add a comment (alias for remark). */
  addComment(value: string): this {
    return this.addSection(value);
  }

  /** Add extra email addresses as a labeled section. */
  addExtraEmails(emails: string[]): this {
    if (emails.length === 0) return this;
    const safe = emails.filter((e) => e.trim() && !detectUnsafeContent(e).isUnsafe);
    if (safe.length === 0) return this;
    return this.addSection(`Extra emails: ${safe.join(", ")}`);
  }

  /** Add extra phone numbers as a labeled section. */
  addExtraPhones(phones: string[]): this {
    if (phones.length === 0) return this;
    const safe = phones.filter((p) => p.trim() && !detectUnsafeContent(p).isUnsafe);
    if (safe.length === 0) return this;
    return this.addSection(`Extra phones: ${safe.join(", ")}`);
  }

  /** Add an unmapped field that may be useful (safe values only). */
  addUnmappedField(label: string, value: string): this {
    if (!label.trim() || !value.trim()) return this;
    const safeValue = this.safeText(value);
    if (!safeValue) return this;
    return this.addSection(`${label.trim()}: ${safeValue}`);
  }

  /** Add a normalization note (e.g., inferred country code). */
  addNormalizationNote(note: string): this {
    return this.addSection(note);
  }

  /** Add the original source text when it doesn't match a known enum. */
  addOriginalSource(source: string): this {
    if (!source.trim()) return this;
    const safe = this.safeText(source);
    if (!safe) return this;
    return this.addSection(`Original source: ${safe}`);
  }

  /** Build and return the final note string. */
  build(): string {
    const note = this.sections
      .filter(Boolean)
      .join(SECTION_SEPARATOR)
      .replace(/\r\n|\n|\r/g, "\\n"); // escape newlines for CSV safety

    if (note.length > MAX_NOTE_LENGTH) {
      return note.slice(0, MAX_NOTE_LENGTH - 3) + "...";
    }
    return note;
  }

  private safeText(value: string): string {
    const check = detectUnsafeContent(value);
    if (check.isUnsafe) return ""; // never put malicious content in notes
    // Use stripped version for HTML content; replace real line breaks with escaped \n
    return check.strippedValue.replace(/\r\n|\n|\r/g, "\\n").trim();
  }

  private addSection(raw: string): this {
    const text = this.safeText(raw);
    if (!text) return this;
    // Deduplicate
    if (this.sections.some((s) => s === text || s.includes(text))) return this;
    this.sections.push(text);
    return this;
  }
}

/** Convenience function: build a CRM note from parts. */
export function buildCrmNote({
  remarks,
  extraEmails,
  extraPhones,
  originalSource,
  unmappedFields,
}: {
  remarks?: string[];
  extraEmails?: string[];
  extraPhones?: string[];
  originalSource?: string;
  unmappedFields?: { label: string; value: string }[];
}): string {
  const builder = new CRMNoteBuilder();

  for (const remark of remarks ?? []) {
    builder.addRemark(remark);
  }

  if (extraEmails?.length) builder.addExtraEmails(extraEmails);
  if (extraPhones?.length) builder.addExtraPhones(extraPhones);
  if (originalSource) builder.addOriginalSource(originalSource);

  for (const { label, value } of unmappedFields ?? []) {
    builder.addUnmappedField(label, value);
  }

  return builder.build();
}
