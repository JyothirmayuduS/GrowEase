/**
 * Comprehensive Hybrid Pipeline Tests
 * Tests all required cases from the GrowEasy assignment requirements.
 */

import { describe, expect, it } from "vitest";
import { validatePersonName } from "@/lib/services/NameValidationService";
import { extractEmailsFromRow } from "@/lib/services/EmailExtractionService";
import { extractPhonesFromRow } from "@/lib/services/PhoneExtractionService";
import { detectFormulaInjection, escapeCsvFormulaForExport, detectUnsafeContent } from "@/lib/services/SanitizationService";
import { analyzeTextQuality } from "@/lib/services/TextQualityService";
import { DuplicateDetectionService } from "@/lib/services/DuplicateDetectionService";
import { hybridProcessRecord } from "@/lib/services/HybridRowProcessor";
import { hasValidContact, classifyRecord } from "@/lib/services/RecordClassificationService";
import { emptyCrmRecord } from "@/lib/validation/crm-record";

// ═══════════════════════════════════════════════════════
// NAME VALIDATION TESTS
// ═══════════════════════════════════════════════════════

describe("validatePersonName — valid names", () => {
  const validNames = [
    ["Ravi Kumar", "standard Indian name"],
    ["S. Jyothirmayudu", "initial + surname"],
    ["O'Connor", "name with apostrophe"],
    ["Mary-Jane Smith", "hyphenated name"],
    ["José Martínez", "accented characters"],
    ["A R Rahman", "initials style"],
    ["Mohammed Ali Khan", "Arabic/Muslim name"],
    ["Ravi 🏠 Kumar", "emoji mixed with real name"],
    ["Ann", "short but valid"],
    ["A.", "single initial with period"],
  ];

  for (const [name, label] of validNames) {
    it(`accepts "${name}" (${label})`, () => {
      const result = validatePersonName(name);
      expect(result.isValid, `"${name}" should be valid`).toBe(true);
    });
  }
});

describe("validatePersonName — formula injection (must be rejected)", () => {
  const formulaNames = [
    ["=SUM(A1:A3)", "POTENTIAL_CSV_FORMULA"],
    ["+SUM(A1:A3)", "POTENTIAL_CSV_FORMULA"],
    ["-DROP TABLE", "POTENTIAL_CSV_FORMULA"],
    ["@SUM(A1:A3)", "POTENTIAL_CSV_FORMULA"],
    ["=A1+B1", "POTENTIAL_CSV_FORMULA"],
    ["+91 9876543210", null], // this is a phone number, not a formula — actually valid
  ];

  it('rejects "=SUM(A1:A3)" as formula', () => {
    const r = validatePersonName("=SUM(A1:A3)");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("POTENTIAL_CSV_FORMULA");
  });

  it('rejects "+SUM(A1:A3)" as formula', () => {
    const r = validatePersonName("+SUM(A1:A3)");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("POTENTIAL_CSV_FORMULA");
  });

  it('rejects "-DROP TABLE" as formula/suspicious', () => {
    const r = validatePersonName("-DROP TABLE");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("POTENTIAL_CSV_FORMULA");
  });

  it('rejects "@SUM(A1:A3)" as formula', () => {
    const r = validatePersonName("@SUM(A1:A3)");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("POTENTIAL_CSV_FORMULA");
  });
});

describe("validatePersonName — script/HTML injection (must be rejected)", () => {
  it('rejects "<script>alert(1)</script>"', () => {
    const r = validatePersonName("<script>alert(1)</script>");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("MALICIOUS_OR_UNSAFE_TEXT");
  });

  it('rejects "javascript:alert(1)"', () => {
    const r = validatePersonName("javascript:alert(1)");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("MALICIOUS_OR_UNSAFE_TEXT");
  });

  it('rejects "<img src=x onerror=alert(1)>"', () => {
    const r = validatePersonName("<img src=x onerror=alert(1)>");
    expect(r.isValid).toBe(false);
    expect(r.reasonCode).toBe("MALICIOUS_OR_UNSAFE_TEXT");
  });

  it('rejects "DROP TABLE users"', () => {
    const r = validatePersonName("DROP TABLE users");
    expect(r.isValid).toBe(false);
  });
});

describe("validatePersonName — garbage/repeated text (must be rejected)", () => {
  it('rejects "AAAAAAAAAAAAAAAAAAAA"', () => {
    const r = validatePersonName("AAAAAAAAAAAAAAAAAAAA");
    expect(r.isValid).toBe(false);
  });

  it('rejects "abababababababababab"', () => {
    const r = validatePersonName("abababababababababab");
    expect(r.isValid).toBe(false);
  });

  it('rejects "11111111111111111111"', () => {
    const r = validatePersonName("11111111111111111111");
    expect(r.isValid).toBe(false);
  });

  it('rejects "qwertyqwertyqwerty"', () => {
    const r = validatePersonName("qwertyqwertyqwerty");
    expect(r.isValid).toBe(false);
  });

  it('rejects exact placeholder "test"', () => {
    const r = validatePersonName("test");
    expect(r.isValid).toBe(false);
  });

  it('rejects exact placeholder "null"', () => {
    const r = validatePersonName("null");
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// TEXT QUALITY TESTS
// ═══════════════════════════════════════════════════════

describe("analyzeTextQuality", () => {
  it("flags AAAAAAAAAAAAAAAAAAAA as not meaningful", () => {
    const r = analyzeTextQuality("AAAAAAAAAAAAAAAAAAAA", true);
    expect(r.isMeaningful).toBe(false);
  });

  it("flags abababababababababab as not meaningful", () => {
    const r = analyzeTextQuality("abababababababababab", true);
    expect(r.isMeaningful).toBe(false);
  });

  it("accepts Ravi Kumar as meaningful", () => {
    const r = analyzeTextQuality("Ravi Kumar", true);
    expect(r.isMeaningful).toBe(true);
  });

  it("accepts Ann as meaningful", () => {
    const r = analyzeTextQuality("Ann", true);
    expect(r.isMeaningful).toBe(true);
  });

  it("accepts A A Rahman as meaningful", () => {
    const r = analyzeTextQuality("A A Rahman", true);
    expect(r.isMeaningful).toBe(true);
  });

  it("flags 111111111111111111 as not meaningful", () => {
    const r = analyzeTextQuality("111111111111111111", true);
    expect(r.isMeaningful).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// FORMULA INJECTION TESTS
// ═══════════════════════════════════════════════════════

describe("detectFormulaInjection", () => {
  it("detects =SUM(A1:A3)", () => expect(detectFormulaInjection("=SUM(A1:A3)")).toBe(true));
  it("detects +SUM(A1:A3)", () => expect(detectFormulaInjection("+SUM(A1:A3)")).toBe(true));
  it("detects -DROP TABLE", () => expect(detectFormulaInjection("-DROP TABLE")).toBe(true));
  it("detects @SUM(A1:A3)", () => expect(detectFormulaInjection("@SUM(A1:A3)")).toBe(true));
  it("does NOT flag -12.5 (negative number)", () => expect(detectFormulaInjection("-12.5")).toBe(false));
  it("does NOT flag +91 (country code)", () => expect(detectFormulaInjection("+91")).toBe(false));
  it("does NOT flag normal text", () => expect(detectFormulaInjection("Ravi Kumar")).toBe(false));
});

describe("escapeCsvFormulaForExport", () => {
  it("prefixes =SUM with apostrophe", () => {
    expect(escapeCsvFormulaForExport("=SUM(A1:A3)")).toBe("'=SUM(A1:A3)");
  });
  it("prefixes +SUM with apostrophe", () => {
    expect(escapeCsvFormulaForExport("+SUM(A1:A3)")).toBe("'+SUM(A1:A3)");
  });
  it("does not modify normal text", () => {
    expect(escapeCsvFormulaForExport("Ravi Kumar")).toBe("Ravi Kumar");
  });
  it("does not modify Unicode names", () => {
    expect(escapeCsvFormulaForExport("José Martínez")).toBe("José Martínez");
  });
  it("preserves newline-escaped text", () => {
    const value = "Some note\\nwith line breaks";
    expect(escapeCsvFormulaForExport(value)).toBe(value);
  });
});

// ═══════════════════════════════════════════════════════
// EMAIL EXTRACTION TESTS
// ═══════════════════════════════════════════════════════

describe("extractEmailsFromRow — single email", () => {
  it("extracts one email as primary", () => {
    const r = extractEmailsFromRow({ email: "john@example.com", name: "John" });
    expect(r.primaryEmail).toBe("john@example.com");
    expect(r.extraEmails).toHaveLength(0);
  });
});

describe("extractEmailsFromRow — two emails", () => {
  it("puts first email as primary, second in extras", () => {
    const r = extractEmailsFromRow({
      primary_email: "john@example.com",
      alternate: "john.work@example.com",
    });
    expect(r.primaryEmail).toBe("john@example.com");
    expect(r.extraEmails).toContain("john.work@example.com");
  });
});

describe("extractEmailsFromRow — deduplication", () => {
  it("deduplicates the same email", () => {
    const r = extractEmailsFromRow({
      email: "john@example.com",
      alternate: "john@example.com",
    });
    expect(r.primaryEmail).toBe("john@example.com");
    expect(r.extraEmails).toHaveLength(0);
  });

  it("deduplicates case-insensitively", () => {
    const r = extractEmailsFromRow({
      email: "John@Example.COM",
      alternate: "john@example.com",
    });
    expect(r.extraEmails).toHaveLength(0);
  });
});

describe("extractEmailsFromRow — email in non-email column", () => {
  it("extracts email from mobile column", () => {
    const r = extractEmailsFromRow({
      name: "John",
      mobile: "john@example.com",
    });
    expect(r.primaryEmail).toBe("john@example.com");
  });
});

// ═══════════════════════════════════════════════════════
// PHONE EXTRACTION TESTS
// ═══════════════════════════════════════════════════════

describe("extractPhonesFromRow — single phone", () => {
  it("extracts one phone as primary", () => {
    const r = extractPhonesFromRow({ mobile: "9876543210", name: "John" });
    expect(r.primaryPhone?.number).toBe("9876543210");
    expect(r.extraPhones).toHaveLength(0);
  });
});

describe("extractPhonesFromRow — multiple phones", () => {
  it("puts first phone primary, rest in extras", () => {
    const r = extractPhonesFromRow({ mobile: "9876543210", alt_phone: "9876543211" });
    expect(r.primaryPhone?.number).toBeDefined();
    expect(r.extraPhones.length).toBeGreaterThan(0);
  });
});

describe("extractPhonesFromRow — email NOT classified as phone", () => {
  it("does not pick up an email address as a phone", () => {
    const r = extractPhonesFromRow({ mobile: "john@example.com", name: "John" });
    expect(r.primaryPhone).toBeNull();
  });
});

describe("extractPhonesFromRow — India country inference", () => {
  it("infers +91 for 10-digit number when country is India", () => {
    const r = extractPhonesFromRow({ mobile: "9876543210" }, "India");
    expect(r.primaryPhone?.countryCode).toBe("+91");
  });

  it("does not infer +91 without country context", () => {
    const r = extractPhonesFromRow({ mobile: "9876543210" });
    // No country context → no inferred country code
    expect(r.primaryPhone?.countryCode).toBe("");
  });
});

describe("extractPhonesFromRow — deduplicated phone", () => {
  it("deduplicates the same phone number", () => {
    const r = extractPhonesFromRow({
      mobile: "9876543210",
      alt_phone: "9876543210",
    });
    expect(r.extraPhones).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════
// DUPLICATE DETECTION TESTS
// ═══════════════════════════════════════════════════════

describe("DuplicateDetectionService", () => {
  it("marks first occurrence as UNIQUE", () => {
    const tracker = new DuplicateDetectionService();
    const r = tracker.check("john@example.com", "+91", "9876543210", 1);
    expect(r.status).toBe("UNIQUE");
  });

  it("marks second identical occurrence as DUPLICATE_IN_FILE", () => {
    const tracker = new DuplicateDetectionService();
    tracker.check("john@example.com", "+91", "9876543210", 1);
    const r = tracker.check("john@example.com", "+91", "9876543210", 2);
    expect(r.status).toBe("DUPLICATE_IN_FILE");
    expect(r.firstSeenAtRow).toBe(1);
  });

  it("does not flag different contacts as duplicate", () => {
    const tracker = new DuplicateDetectionService();
    tracker.check("john@example.com", "+91", "9876543210", 1);
    const r = tracker.check("jane@example.com", "+91", "9876543211", 2);
    expect(r.status).toBe("UNIQUE");
  });

  it("tracks entries with no contact as UNIQUE (can't fingerprint)", () => {
    const tracker = new DuplicateDetectionService();
    const r = tracker.check("", "", "", 1);
    expect(r.status).toBe("UNIQUE");
  });
});

// ═══════════════════════════════════════════════════════
// RECORD CLASSIFICATION TESTS
// ═══════════════════════════════════════════════════════

describe("classifyRecord", () => {
  it("classifies valid contact + no warnings as IMPORTED", () => {
    const record = {
      ...emptyCrmRecord(),
      email: "john@example.com",
      mobile_without_country_code: "9876543210",
      name: "John Smith",
    };
    const classified = classifyRecord(1, record, [], {});
    expect(classified.recordStatus).toBe("IMPORTED");
  });

  it("classifies valid contact + invalid name warning as NEEDS_REVIEW", () => {
    const record = {
      ...emptyCrmRecord(),
      email: "john@example.com",
      name: "", // name was cleared due to invalid input
    };
    const warnings = [
      { code: "INVALID_NAME", field: "name", message: "Invalid name", severity: "warning" as const },
    ];
    const classified = classifyRecord(1, record, warnings, {});
    expect(classified.recordStatus).toBe("NEEDS_REVIEW");
  });

  it("classifies no email + no phone as SKIPPED", () => {
    const record = { ...emptyCrmRecord(), name: "John" };
    const classified = classifyRecord(1, record, [], {});
    expect(classified.recordStatus).toBe("SKIPPED");
    expect(classified.skipReason).toBeTruthy();
  });

  it("classifies explicit skip reason as SKIPPED", () => {
    const record = { ...emptyCrmRecord(), email: "john@example.com" };
    const classified = classifyRecord(1, record, [], {}, "Duplicate row");
    expect(classified.recordStatus).toBe("SKIPPED");
    expect(classified.skipReason).toBe("Duplicate row");
  });
});

// ═══════════════════════════════════════════════════════
// HYBRID ROW PROCESSOR INTEGRATION TESTS
// ═══════════════════════════════════════════════════════

describe("hybridProcessRecord — name validation", () => {
  it("clears formula names and adds warning", () => {
    const { record, warnings } = hybridProcessRecord(
      { name: "=SUM(A1:A3)", email: "john@example.com" },
      { name: "=SUM(A1:A3)", email: "john@example.com" }
    );
    expect(record.name).toBe("");
    expect(warnings.some((w) => w.code === "POTENTIAL_CSV_FORMULA")).toBe(true);
    // Email preserved → row not skipped
    expect(record.email).toBe("john@example.com");
  });

  it("clears script names and adds warning", () => {
    const { record, warnings } = hybridProcessRecord(
      { name: "<script>alert(1)</script>", email: "john@example.com" },
      { name: "<script>alert(1)</script>", email: "john@example.com" }
    );
    expect(record.name).toBe("");
    expect(warnings.some((w) => w.code === "MALICIOUS_OR_UNSAFE_TEXT")).toBe(true);
  });

  it("keeps valid Unicode names", () => {
    const { record } = hybridProcessRecord(
      { name: "José Martínez", email: "jose@example.com" },
      { name: "José Martínez", email: "jose@example.com" }
    );
    expect(record.name).toBe("José Martínez");
  });

  it("strips emoji from name but keeps readable text", () => {
    const { record } = hybridProcessRecord(
      { name: "Ravi 🏠 Kumar", email: "ravi@example.com" },
      { name: "Ravi 🏠 Kumar", email: "ravi@example.com" }
    );
    expect(record.name).toBe("Ravi Kumar");
  });
});

describe("hybridProcessRecord — email extraction", () => {
  it("extracts email from non-email column", () => {
    const { record } = hybridProcessRecord(
      { name: "John" },
      { name: "John", remarks: "Contact: john@example.com" }
    );
    expect(record.email).toBe("john@example.com");
  });

  it("discards extra emails instead of putting them in crm_note", () => {
    const { record } = hybridProcessRecord(
      { name: "John" },
      { primary_email: "john@example.com", alt_email: "john.work@example.com" }
    );
    expect(record.email).toBe("john@example.com");
    expect(record.crm_note).not.toContain("john.work@example.com");
  });
});

describe("hybridProcessRecord — malicious content not in crm_note", () => {
  it("does not copy script content to crm_note", () => {
    const { record } = hybridProcessRecord(
      { name: "John", email: "john@example.com", crm_note: "<script>alert(1)</script>" },
      { name: "John", email: "john@example.com", crm_note: "<script>alert(1)</script>" }
    );
    expect(record.crm_note).not.toContain("<script>");
    expect(record.crm_note).not.toContain("alert(1)");
  });
});

// ═══════════════════════════════════════════════════════
// EXPORT SAFETY TESTS
// ═══════════════════════════════════════════════════════

describe("CSV export formula safety", () => {
  it("formula cell is prefixed with apostrophe on export", () => {
    expect(escapeCsvFormulaForExport("=SUM(A1:A3)")).toBe("'=SUM(A1:A3)");
  });

  it("normal text unchanged on export", () => {
    expect(escapeCsvFormulaForExport("Ravi Kumar")).toBe("Ravi Kumar");
  });

  it("Unicode survives export unmodified", () => {
    expect(escapeCsvFormulaForExport("José Martínez")).toBe("José Martínez");
  });
});
