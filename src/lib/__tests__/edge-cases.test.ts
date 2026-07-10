/**
 * ============================================================
 * EDGE-CASE TEST SUITE — GrowEasy CRM CSV Import
 * ============================================================
 * This file acts as a thorough QA pass before production.
 * Every test probes a specific real-world failure mode.
 *
 * Organisation:
 *   A. Phone number formats
 *   B. Email formats & multi-email
 *   C. Date / created_at formats
 *   D. Header casing & spacing
 *   E. BOM, trailing whitespace, special characters
 *   F. Formula / injection protection
 *   G. Record skip logic
 *   H. Duplicate rows
 *   I. Ragged rows (missing cells)
 *   J. Unicode / non-ASCII names
 *   K. Multi-value separators
 *   L. Long / oversized values
 *   M. Status & data_source edge values
 *   N. Phone-only / email-only records
 *   O. All-caps headers
 *   P. Row quality assessments
 *   Q. Country code edge cases
 *   R. Empty CSV / header-only CSVs
 *   S. Quoted fields with commas inside
 *   T. Name merging edge cases
 */

import { describe, expect, it } from "vitest";

import { normalizeCsv } from "@/lib/csv/normalize";
import { parsePrimaryPhone, splitEmails, splitPhones } from "@/lib/validation/contact-fields";
import {
  isValidCreatedAt,
  normalizeCrmStatus,
  normalizeDataSource,
  sanitizeCrmRecord,
  getSkipReason,
} from "@/lib/validation/crm-record";
import { assessPreviewRow, assessPreviewRows } from "@/lib/validation/row-quality";
import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";

function extract(headers: string[], rows: Record<string, string>[]) {
  return heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);
}

// ─────────────────────────────────────────────────
// A. PHONE NUMBER FORMATS
// ─────────────────────────────────────────────────
describe("A – Phone number formats", () => {
  it("A1: plain 10-digit Indian mobile", () => {
    const r = parsePrimaryPhone("9876543210");
    expect(r.mobile).toBe("9876543210");
    expect(r.country_code).toBe("");
  });

  it("A2: +91 prefix with dash", () => {
    const r = parsePrimaryPhone("+91-9876543210");
    expect(r.country_code).toBe("+91");
    expect(r.mobile).toBe("9876543210");
  });

  it("A3: +91 prefix with space", () => {
    const r = parsePrimaryPhone("+91 9876543210");
    expect(r.country_code).toBe("+91");
    expect(r.mobile).toBe("9876543210");
  });

  it("A4: 091 prefix (no plus)", () => {
    const r = parsePrimaryPhone("0919876543210");
    // 13 digits → country = first 3, mobile = last 10
    expect(r.mobile).toBe("9876543210");
  });

  it("A5: US number +1-212-555-0100", () => {
    const r = parsePrimaryPhone("+1-212-555-0100");
    expect(r.country_code).toBe("+1");
    expect(r.mobile).toBe("2125550100");
  });

  it("A6: UK number +44 7911 123456", () => {
    const r = parsePrimaryPhone("+44 7911 123456");
    expect(r.country_code).toBe("+44");
    expect(r.mobile).toBe("7911123456");
  });

  it("A7: phone with dots 98.765.4321.0", () => {
    const r = parsePrimaryPhone("98.765.4321.0");
    // 10 digits → no country code
    expect(r.mobile).toBe("9876543210");
    expect(r.country_code).toBe("");
  });

  it("A8: phone with parentheses (98) 76543210", () => {
    const r = parsePrimaryPhone("(98) 76543210");
    expect(r.mobile).toBe("9876543210");
  });

  it("A9: phone too short (<8 digits) returns digits only", () => {
    const r = parsePrimaryPhone("12345");
    expect(r.mobile).toBe("12345");
    expect(r.country_code).toBe("");
  });

  it("A10: phone with leading zeroes 09876543210", () => {
    const r = parsePrimaryPhone("09876543210");
    // 11 digits → +0 (1 digit country), mobile = last 10
    expect(r.mobile).toBe("9876543210");
  });

  it("A11: empty phone string", () => {
    const r = parsePrimaryPhone("");
    expect(r.mobile).toBe("");
    expect(r.country_code).toBe("");
  });

  it("A12: phone only spaces/dashes", () => {
    const r = parsePrimaryPhone("  ---  ");
    expect(r.mobile).toBe("");
  });

  it("A13: phone extracted from full extract pipeline", () => {
    const results = extract(["phone", "email"], [{ phone: "+91-9900112233", email: "a@b.com" }]);
    expect(results[0].country_code).toBe("+91");
    expect(results[0].mobile_without_country_code).toBe("9900112233");
  });

  it("A14: non-digits stripped from mobile in final record", () => {
    const results = extract(["mobile", "email"], [{ mobile: "(800) 123-4567", email: "a@b.com" }]);
    // digits only after sanitize
    expect(results[0].mobile_without_country_code).toMatch(/^\d+$/);
  });
});

// ─────────────────────────────────────────────────
// B. EMAIL FORMATS & MULTI-EMAIL
// ─────────────────────────────────────────────────
describe("B – Email formats & multi-email", () => {
  it("B1: standard email", () => {
    expect(splitEmails("test@example.com")).toEqual(["test@example.com"]);
  });

  it("B2: two emails separated by semicolon", () => {
    const r = splitEmails("a@b.com; c@d.com");
    expect(r).toHaveLength(2);
    expect(r[0]).toBe("a@b.com");
    expect(r[1]).toBe("c@d.com");
  });

  it("B3: two emails separated by pipe", () => {
    const r = splitEmails("a@b.com | c@d.com");
    expect(r[0]).toBe("a@b.com");
  });

  it("B4: two emails separated by comma", () => {
    const r = splitEmails("a@b.com,c@d.com");
    expect(r).toHaveLength(2);
  });

  it("B5: email with subdomain", () => {
    expect(splitEmails("user@mail.company.co.uk")).toHaveLength(1);
  });

  it("B6: email with plus addressing", () => {
    const r = splitEmails("user+tag@example.com");
    expect(r[0]).toBe("user+tag@example.com");
  });

  it("B7: garbage string returns empty", () => {
    expect(splitEmails("not-an-email")).toEqual([]);
  });

  it("B8: empty string returns empty", () => {
    expect(splitEmails("")).toEqual([]);
  });

  it("B9: extra emails discarded from crm_note in pipeline", () => {
    const results = extract(
      ["email", "phone"],
      [{ email: "first@x.com; second@x.com; third@x.com", phone: "9876543210" }]
    );
    expect(results[0].email).toBe("first@x.com");
    expect(results[0].crm_note).not.toContain("second@x.com");
    expect(results[0].crm_note).not.toContain("third@x.com");
  });

  it("B10: email scan fallback when column not named 'email'", () => {
    // No email-named column but email data is in an otherwise unmapped column
    const results = extract(
      ["name", "phone", "misc"],
      [{ name: "Test User", phone: "9876543210", misc: "contact@example.com" }]
    );
    // Fallback email scan should pick it up
    expect(results[0].email).toBe("contact@example.com");
  });
});

// ─────────────────────────────────────────────────
// C. DATE / CREATED_AT FORMATS
// ─────────────────────────────────────────────────
describe("C – Date / created_at formats", () => {
  it("C1: ISO 8601 datetime", () => {
    expect(isValidCreatedAt("2026-06-01T09:00:00Z")).toBe(true);
  });

  it("C2: space-separated datetime (SQL style)", () => {
    expect(isValidCreatedAt("2026-06-01 09:00:00")).toBe(true);
  });

  it("C3: date only (YYYY-MM-DD)", () => {
    expect(isValidCreatedAt("2026-06-01")).toBe(true);
  });

  it("C4: US format MM/DD/YYYY", () => {
    expect(isValidCreatedAt("06/01/2026")).toBe(true);
  });

  it("C5: European format DD/MM/YYYY — JS parses ambiguously but is not NaN", () => {
    // new Date("01/06/2026") is Jan 6 in US locale — still valid
    expect(isValidCreatedAt("01/06/2026")).toBe(true);
  });

  it("C6: blank string is valid (treated as missing)", () => {
    expect(isValidCreatedAt("")).toBe(true);
  });

  it("C7: 'not-a-date' is invalid", () => {
    expect(isValidCreatedAt("not-a-date")).toBe(false);
  });

  it("C8: random text is invalid", () => {
    expect(isValidCreatedAt("tomorrow morning")).toBe(false);
  });

  it("C9: invalid date cleared in pipeline", () => {
    const results = extract(
      ["name", "email", "date"],
      [{ name: "A", email: "a@b.com", date: "garbage-date" }]
    );
    expect(results[0].created_at).toBe("");
  });

  it("C10: valid date preserved through pipeline", () => {
    const results = extract(
      ["name", "email", "created_at"],
      [{ name: "A", email: "a@b.com", created_at: "2026-07-01 10:00:00" }]
    );
    // Date is now normalized to ISO 8601
    expect(results[0].created_at).toMatch(/^2026-07-01/);
    expect(Number.isNaN(new Date(results[0].created_at).getTime())).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// D. HEADER CASING & SPACING
// ─────────────────────────────────────────────────
describe("D – Header casing & spacing", () => {
  it("D1: ALL CAPS headers", () => {
    const results = extract(
      ["NAME", "EMAIL", "PHONE"],
      [{ NAME: "Ravi Kumar", EMAIL: "ravi@x.com", PHONE: "9876543210" }]
    );
    expect(results[0].name).toBe("Ravi Kumar");
    expect(results[0].email).toBe("ravi@x.com");
    expect(results[0].mobile_without_country_code).toBe("9876543210");
  });

  it("D2: Title Case headers", () => {
    const results = extract(
      ["Name", "Email", "Mobile"],
      [{ Name: "Priya", Email: "priya@x.com", Mobile: "9000000001" }]
    );
    expect(results[0].name).toBe("Priya");
    expect(results[0].email).toBe("priya@x.com");
  });

  it("D3: headers with leading/trailing spaces", () => {
    const { headers } = normalizeCsv(["  name  ", " email ", " phone "], []);
    expect(headers).toEqual(["name", "email", "phone"]);
  });

  it("D4: headers with hyphens instead of underscores", () => {
    const results = extract(
      ["full-name", "e-mail", "phone-number"],
      [{ "full-name": "John Doe", "e-mail": "john@x.com", "phone-number": "9111111111" }]
    );
    expect(results[0].name).toBe("John Doe");
    expect(results[0].email).toBe("john@x.com");
  });

  it("D5: mixed separator headers (spaces in header name)", () => {
    const results = extract(
      ["Full Name", "Email Address", "Phone Number"],
      [{ "Full Name": "Jane Smith", "Email Address": "jane@x.com", "Phone Number": "9222222222" }]
    );
    expect(results[0].name).toBe("Jane Smith");
    expect(results[0].email).toBe("jane@x.com");
  });
});

// ─────────────────────────────────────────────────
// E. BOM, WHITESPACE, SPECIAL CHARACTERS
// ─────────────────────────────────────────────────
describe("E – BOM, whitespace, special characters", () => {
  it("E1: BOM stripped from headers via normalizeCsv", () => {
    const { headers } = normalizeCsv(["\uFEFFname", "email"], []);
    expect(headers[0]).toBe("name");
  });

  it("E2: value with surrounding whitespace is trimmed", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "  Ravi Kumar  ", email: "  ravi@x.com  " }]
    );
    expect(results[0].name).toBe("Ravi Kumar");
    expect(results[0].email).toBe("ravi@x.com");
  });

  it("E3: value with embedded tabs treated as regular text", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "Ravi\tKumar", email: "ravi@x.com" }]
    );
    expect(results[0].name).toContain("Ravi");
  });

  it("E4: null/undefined cell value treated as empty string", () => {
    const results = extract(
      ["name", "email", "phone"],
      [{ name: "Test", email: "test@x.com", phone: undefined as unknown as string }]
    );
    expect(results[0].mobile_without_country_code).toBe("");
  });

  it("E5: value that is only whitespace treated as empty", () => {
    const results = extract(
      ["name", "email", "phone"],
      [{ name: "Test", email: "test@x.com", phone: "   " }]
    );
    expect(results[0].mobile_without_country_code).toBe("");
  });
});

// ─────────────────────────────────────────────────
// F. FORMULA / INJECTION PROTECTION
// ─────────────────────────────────────────────────
describe("F – Formula / injection protection", () => {
  const inject = (val: string) =>
    extract(["name", "email"], [{ name: val, email: "a@b.com" }])[0].name;

  it("F1: =SUM(...) formula prefixed with apostrophe", () => {
    expect(inject("=SUM(A1:A10)")).toMatch(/^'=/);
  });

  it("F2: +value prefixed", () => {
    expect(inject("+1234")).toMatch(/^'\+/);
  });

  it("F3: -value prefixed", () => {
    expect(inject("-DROP TABLE")).toMatch(/^'-/);
  });

  it("F4: @value prefixed", () => {
    expect(inject("@SUM")).toMatch(/^'@/);
  });

  it("F5: normal name NOT prefixed", () => {
    expect(inject("Ravi Kumar")).toBe("Ravi Kumar");
  });

  it("F6: <script> tag — NOT prefixed (no leading injection char), but stored as text", () => {
    expect(inject("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });

  it("F7: SQL injection in note field is stored as literal text", () => {
    const results = extract(
      ["name", "email", "note"],
      [{ name: "Test", email: "a@b.com", note: "'; DROP TABLE leads; --" }]
    );
    expect(results[0].crm_note).toContain("DROP TABLE");
  });

  it("F8: formula in email — invalid format, stored as crm_note edge case", () => {
    // Email regex won't match =FORMULA, so it's filtered out
    const results = extract(
      ["name", "email"],
      [{ name: "Test", email: "=HYPERLINK(\"http://evil.com\")" }]
    );
    // Email should be empty (invalid format) and name is non-empty so not skipped
    expect(results[0].email).toBe("");
  });
});

// ─────────────────────────────────────────────────
// G. RECORD SKIP LOGIC
// ─────────────────────────────────────────────────
describe("G – Record skip logic", () => {
  it("G1: record with neither email nor phone is skipped", () => {
    const results = extract(
      ["name", "email", "phone"],
      [{ name: "Ghost", email: "", phone: "" }]
    );
    expect(getSkipReason(results[0])).not.toBeNull();
  });

  it("G2: record with only email is NOT skipped", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "Email Only", email: "only@x.com" }]
    );
    expect(getSkipReason(results[0])).toBeNull();
  });

  it("G3: record with only phone is NOT skipped", () => {
    const results = extract(
      ["name", "phone"],
      [{ name: "Phone Only", phone: "9876543210" }]
    );
    expect(getSkipReason(results[0])).toBeNull();
  });

  it("G4: completely empty row is skipped", () => {
    const results = extract(
      ["name", "email", "phone"],
      [{ name: "", email: "", phone: "" }]
    );
    expect(getSkipReason(results[0])).not.toBeNull();
  });

  it("G5: row with only note/status but no contact info is skipped", () => {
    const results = extract(
      ["name", "note", "status"],
      [{ name: "Nobody", note: "some note", status: "hot" }]
    );
    expect(getSkipReason(results[0])).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────
// H. DUPLICATE ROW DETECTION
// ─────────────────────────────────────────────────
describe("H – Duplicate row detection", () => {
  it("H1: exact duplicate row detected as skipped", () => {
    const row = { name: "Ravi", email: "ravi@x.com", phone: "9876543210" };
    const assessments = assessPreviewRows(["name", "email", "phone"], [row, row]);
    expect(assessments[0].state).not.toBe("skipped"); // first OK
    expect(assessments[1].state).toBe("skipped");
    expect(assessments[1].flags[0].kind).toBe("duplicate");
  });

  it("H2: case-insensitive duplicate detection", () => {
    const row1 = { name: "Ravi", email: "ravi@x.com" };
    const row2 = { name: "RAVI", email: "RAVI@X.COM" };
    const assessments = assessPreviewRows(["name", "email"], [row1, row2]);
    expect(assessments[1].state).toBe("skipped");
  });

  it("H3: non-duplicate rows are both clean", () => {
    const row1 = { name: "Ravi", email: "ravi@x.com", phone: "9876543210" };
    const row2 = { name: "Priya", email: "priya@x.com", phone: "9000000000" };
    const assessments = assessPreviewRows(["name", "email", "phone"], [row1, row2]);
    expect(assessments[0].state).toBe("clean");
    expect(assessments[1].state).toBe("clean");
  });
});

// ─────────────────────────────────────────────────
// I. RAGGED ROWS (MISSING CELLS)
// ─────────────────────────────────────────────────
describe("I – Ragged rows", () => {
  it("I1: row with missing columns treated as empty string", () => {
    // Papa parse fills missing cells as undefined; normalizeCsv should produce ""
    const { rows } = normalizeCsv(["name", "email", "phone"], [{ name: "Test" }]);
    expect(rows[0].email ?? "").toBe("");
  });

  it("I2: row with extra columns beyond headers — ignored gracefully", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "Test", email: "t@x.com", extra_unknown_col: "ignored" }]
    );
    expect(results[0].name).toBe("Test");
    expect(results[0].email).toBe("t@x.com");
  });
});

// ─────────────────────────────────────────────────
// J. UNICODE / NON-ASCII NAMES
// ─────────────────────────────────────────────────
describe("J – Unicode / non-ASCII names", () => {
  it("J1: Telugu name preserved as-is", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "రవి కుమార్", email: "ravi@x.com" }]
    );
    expect(results[0].name).toBe("రవి కుమార్");
  });

  it("J2: Hindi name preserved as-is", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "राहुल शर्मा", email: "r@x.com" }]
    );
    expect(results[0].name).toBe("राहुल शर्मा");
  });

  it("J2b: Hindi name is non-empty", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "राहुल शर्मा", email: "r@x.com" }]
    );
    expect(results[0].name.length).toBeGreaterThan(0);
  });

  it("J3: Arabic name preserved", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "أحمد علي", email: "ahmed@x.com" }]
    );
    expect(results[0].name).toBe("أحمد علي");
  });

  it("J4: accented Latin characters preserved", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "José García", email: "jose@x.com" }]
    );
    expect(results[0].name).toBe("José García");
  });

  it("J5: emoji in name field — stored as-is (no crash)", () => {
    const results = extract(
      ["name", "email"],
      [{ name: "Ravi 🏠 Kumar", email: "r@x.com" }]
    );
    expect(results[0].name).toContain("Ravi");
  });
});

// ─────────────────────────────────────────────────
// K. MULTI-VALUE SEPARATORS
// ─────────────────────────────────────────────────
describe("K – Multi-value separators", () => {
  it("K1: pipe-separated phones split correctly", () => {
    const phones = splitPhones("9876543210|9000112233");
    expect(phones).toHaveLength(2);
    expect(phones[0]).toBe("9876543210");
  });

  it("K2: semicolon-separated phones", () => {
    const phones = splitPhones("9876543210;9000112233");
    expect(phones).toHaveLength(2);
  });

  it("K3: slash-separated phones", () => {
    const phones = splitPhones("9876543210/9000112233");
    expect(phones).toHaveLength(2);
  });

  it("K4: comma in address/notes NOT treated as phone separator", () => {
    // phone column won't use comma as separator
    const results = extract(
      ["name", "phone", "email"],
      [{ name: "Test", phone: "9876543210,9000112233", email: "t@x.com" }]
    );
    // comma is not a PHONE_SPLIT_RE char, so it stays as one value
    // parsePrimaryPhone will strip non-digits
    expect(results[0].mobile_without_country_code).toMatch(/^\d+$/);
  });

  it("K5: extra phones discarded from crm_note", () => {
    const results = extract(
      ["name", "phone", "email"],
      [{ name: "Test", phone: "9876543210|9000112233", email: "t@x.com" }]
    );
    expect(results[0].mobile_without_country_code).toBe("9876543210");
    expect(results[0].crm_note).not.toContain("9000112233");
  });
});

// ─────────────────────────────────────────────────
// L. LONG / OVERSIZED VALUES
// ─────────────────────────────────────────────────
describe("L – Long / oversized values", () => {
  it("L1: very long name (500 chars) is stored without crash", () => {
    const longName = "A".repeat(500);
    const results = extract(["name", "email"], [{ name: longName, email: "a@b.com" }]);
    expect(results[0].name.length).toBeGreaterThan(0);
  });

  it("L2: very long note (2000 chars) stored without crash", () => {
    const longNote = "Note ".repeat(400);
    const results = extract(
      ["name", "email", "note"],
      [{ name: "Test", email: "a@b.com", note: longNote }]
    );
    expect(results[0].crm_note.length).toBeGreaterThan(0);
  });

  it("L3: 50-column CSV does not crash (only known fields extracted)", () => {
    const headers = Array.from({ length: 50 }, (_, i) => `col_${i}`);
    headers[0] = "name";
    headers[1] = "email";
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = `val_${i}`; });
    row["name"] = "Test User";
    row["email"] = "test@x.com";
    const results = extract(headers, [row]);
    expect(results[0].name).toBe("Test User");
    expect(results[0].email).toBe("test@x.com");
  });
});

// ─────────────────────────────────────────────────
// M. STATUS & DATA_SOURCE EDGE VALUES
// ─────────────────────────────────────────────────
describe("M – Status & data_source edge values", () => {
  it("M1: empty status stays empty", () => {
    expect(normalizeCrmStatus("").value).toBe("");
  });

  it("M2: null status stays empty", () => {
    expect(normalizeCrmStatus(null).value).toBe("");
  });

  it("M3: numeric status (e.g. 1) stays empty", () => {
    expect(normalizeCrmStatus(1).value).toBe("");
  });

  it("M4: unrecognized status stays empty", () => {
    expect(normalizeCrmStatus("maybe someday").value).toBe("");
  });

  it("M5: exact enum value GOOD_LEAD_FOLLOW_UP accepted verbatim", () => {
    expect(normalizeCrmStatus("GOOD_LEAD_FOLLOW_UP").value).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("M6: exact enum lowercase variant normalised", () => {
    expect(normalizeCrmStatus("good_lead_follow_up").value).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("M7: data_source empty string stays empty", () => {
    expect(normalizeDataSource("").value).toBe("");
  });

  it("M8: unknown project appended to note, data_source blank", () => {
    const results = extract(
      ["name", "email", "source"],
      [{ name: "T", email: "t@x.com", source: "XYZ Unknown Project" }]
    );
    expect(results[0].data_source).toBe("");
    expect(results[0].crm_note).toContain("XYZ Unknown Project");
  });

  it("M9: data_source case insensitive (MERIDIAN TOWER)", () => {
    expect(normalizeDataSource("MERIDIAN TOWER").value).toBe("meridian_tower");
  });

  it("M10: data_source with leading/trailing spaces normalised", () => {
    expect(normalizeDataSource("  Eden Park  ").value).toBe("eden_park");
  });
});

// ─────────────────────────────────────────────────
// N. PHONE-ONLY / EMAIL-ONLY RECORDS
// ─────────────────────────────────────────────────
describe("N – Phone-only / email-only records", () => {
  it("N1: email-only record (no phone column) not skipped", () => {
    const results = extract(["name", "email"], [{ name: "Test", email: "t@x.com" }]);
    expect(getSkipReason(results[0])).toBeNull();
  });

  it("N2: phone-only record (no email column) not skipped", () => {
    const results = extract(["name", "mobile"], [{ name: "Test", mobile: "9876543210" }]);
    expect(getSkipReason(results[0])).toBeNull();
  });

  it("N3: minimal CSV with just name+phone — all fields extracted", () => {
    const results = extract(
      ["name", "phone"],
      [{ name: "Minimal User", phone: "9876543210" }]
    );
    expect(results[0].name).toBe("Minimal User");
    expect(results[0].mobile_without_country_code).toBe("9876543210");
    expect(results[0].email).toBe("");
  });
});

// ─────────────────────────────────────────────────
// O. ALL-CAPS HEADERS
// ─────────────────────────────────────────────────
describe("O – ALL-CAPS headers mapping", () => {
  const CAPS_HEADERS = ["NAME", "EMAIL ADDRESS", "MOBILE NUMBER", "COMPANY NAME",
    "CITY", "STATE", "COUNTRY", "OWNER", "STATUS", "NOTES", "SOURCE", "POSSESSION", "DETAILS"];

  it("O1: maps NAME header", () => {
    const r = extract(["NAME", "EMAIL"], [{ NAME: "Kapil", EMAIL: "k@x.com" }]);
    expect(r[0].name).toBe("Kapil");
  });

  it("O2: maps EMAIL ADDRESS header", () => {
    const r = extract(["NAME", "EMAIL ADDRESS"], [{ NAME: "K", "EMAIL ADDRESS": "k@x.com" }]);
    expect(r[0].email).toBe("k@x.com");
  });

  it("O3: maps MOBILE NUMBER header", () => {
    const r = extract(["MOBILE NUMBER", "EMAIL"], [{ "MOBILE NUMBER": "9876543210", EMAIL: "k@x.com" }]);
    expect(r[0].mobile_without_country_code).toBe("9876543210");
  });

  it("O4: maps STATUS header", () => {
    const r = extract(["EMAIL", "STATUS"], [{ EMAIL: "k@x.com", STATUS: "hot" }]);
    expect(r[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("O5: maps NOTES header", () => {
    const r = extract(["EMAIL", "NOTES"], [{ EMAIL: "k@x.com", NOTES: "Call after 6PM" }]);
    expect(r[0].crm_note).toContain("Call after 6PM");
  });

  it("O6: full all-caps CSV roundtrip", () => {
    const r = extract(
      CAPS_HEADERS,
      [{
        NAME: "Priya", "EMAIL ADDRESS": "priya@x.com", "MOBILE NUMBER": "9111222333",
        "COMPANY NAME": "TechCo", CITY: "Hyderabad", STATE: "Telangana", COUNTRY: "India",
        OWNER: "agent@crm.com", STATUS: "hot", NOTES: "Interested", SOURCE: "Meridian Tower",
        POSSESSION: "Q3 2027", DETAILS: "3BHK preferred",
      }]
    );
    expect(r[0].name).toBe("Priya");
    expect(r[0].email).toBe("priya@x.com");
    expect(r[0].mobile_without_country_code).toBe("9111222333");
    expect(r[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(r[0].data_source).toBe("meridian_tower");
    expect(r[0].possession_time).toBe("Q3 2027");
    expect(r[0].city).toBe("Hyderabad");
    expect(r[0].state).toBe("Telangana");
  });
});

// ─────────────────────────────────────────────────
// P. ROW QUALITY ASSESSMENTS
// ─────────────────────────────────────────────────
describe("P – Row quality assessments", () => {
  it("P1: clean row with name + email + phone", () => {
    const a = assessPreviewRow(
      { name: "Ravi", email: "ravi@x.com", phone: "9876543210" },
      ["name", "email", "phone"]
    );
    expect(a.state).toBe("clean");
  });

  it("P2: missing name flagged as needs_review", () => {
    const a = assessPreviewRow(
      { name: "", email: "r@x.com", phone: "9876543210" },
      ["name", "email", "phone"]
    );
    expect(a.state).toBe("needs_review");
    expect(a.flags.some((f) => f.kind === "missing")).toBe(true);
  });

  it("P3: malformed email flagged as needs_review", () => {
    const a = assessPreviewRow(
      { name: "Ravi", email: "not-an-email", phone: "9876543210" },
      ["name", "email", "phone"]
    );
    expect(a.state).toBe("needs_review");
    expect(a.flags.some((f) => f.kind === "malformed")).toBe(true);
  });

  it("P4: multiple emails in one cell flagged as ambiguous", () => {
    const a = assessPreviewRow(
      { name: "Ravi", email: "a@x.com|b@x.com", phone: "9876543210" },
      ["name", "email", "phone"]
    );
    expect(a.state).toBe("needs_review");
    expect(a.flags.some((f) => f.label === "Multiple emails")).toBe(true);
  });

  it("P5: multiple phones flagged as ambiguous", () => {
    const a = assessPreviewRow(
      { name: "Ravi", email: "r@x.com", phone: "9876543210|9000000000" },
      ["name", "email", "phone"]
    );
    expect(a.flags.some((f) => f.label === "Multiple phones")).toBe(true);
  });

  it("P6: no email AND no phone flagged as missing", () => {
    const a = assessPreviewRow(
      { name: "Ghost" },
      ["name"]
    );
    expect(a.flags.some((f) => f.label === "No email or phone")).toBe(true);
  });

  it("P7: fully empty row is skipped", () => {
    const a = assessPreviewRow(
      { name: "", email: "", phone: "" },
      ["name", "email", "phone"]
    );
    expect(a.state).toBe("skipped");
    expect(a.flags[0].kind).toBe("empty_row");
  });

  it("P8: phone too short (< 8 digits) flagged as suspicious", () => {
    const a = assessPreviewRow(
      { name: "Test", email: "t@x.com", phone: "1234" },
      ["name", "email", "phone"]
    );
    expect(a.flags.some((f) => f.label === "Suspicious phone")).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// Q. COUNTRY CODE EDGE CASES
// ─────────────────────────────────────────────────
describe("Q – Country code edge cases", () => {
  it("Q1: explicit country_code column preserved", () => {
    const results = extract(
      ["name", "email", "mobile", "country_code"],
      [{ name: "T", email: "t@x.com", mobile: "9876543210", country_code: "+91" }]
    );
    expect(results[0].country_code).toBe("+91");
  });

  it("Q2: +91 extracted from number when no country_code column", () => {
    const results = extract(
      ["name", "email", "mobile"],
      [{ name: "T", email: "t@x.com", mobile: "+91-9876543210" }]
    );
    expect(results[0].country_code).toBe("+91");
    expect(results[0].mobile_without_country_code).toBe("9876543210");
  });

  it("Q3: explicitly provided country_code not overwritten by phone prefix", () => {
    const results = extract(
      ["name", "email", "mobile", "country_code"],
      [{ name: "T", email: "t@x.com", mobile: "+91-9876543210", country_code: "+44" }]
    );
    // country_code column wins
    expect(results[0].country_code).toBe("+44");
  });
});

// ─────────────────────────────────────────────────
// R. EMPTY CSV / HEADER-ONLY CSV
// ─────────────────────────────────────────────────
describe("R – Empty / degenerate CSV", () => {
  it("R1: header-only CSV produces zero results", () => {
    const results = extract(["name", "email", "phone"], []);
    expect(results).toHaveLength(0);
  });

  it("R2: normalizeCsv with no headers and no rows returns safely", () => {
    const { headers, rows } = normalizeCsv([], []);
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it("R3: assessPreviewRows on empty array returns empty", () => {
    const assessments = assessPreviewRows(["name", "email"], []);
    expect(assessments).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────
// S. QUOTED FIELDS WITH COMMAS INSIDE
// ─────────────────────────────────────────────────
describe("S – Quoted fields with commas inside", () => {
  it("S1: company name with comma (from normalizeCsv) preserved", () => {
    // PapaParse already handles this; we test post-normalization
    const { rows } = normalizeCsv(
      ["name", "company", "email"],
      [{ name: "Test", company: "Tata, Infosys & Co", email: "t@x.com" }]
    );
    expect(rows[0].company).toBe("Tata, Infosys & Co");
  });

  it("S2: address with comma in description preserved", () => {
    const results = extract(
      ["name", "email", "description"],
      [{ name: "T", email: "t@x.com", description: "Plot 12, Phase 3, Sector 4" }]
    );
    expect(results[0].description).toBe("Plot 12, Phase 3, Sector 4");
  });

  it("S3: newline inside quoted field is escaped in crm_note", () => {
    const results = extract(
      ["name", "email", "note"],
      [{ name: "T", email: "t@x.com", note: "Line 1\nLine 2" }]
    );
    // escapeNewlines should convert \n to \\n
    expect(results[0].crm_note).toContain("\\n");
  });
});

// ─────────────────────────────────────────────────
// T. NAME MERGING EDGE CASES
// ─────────────────────────────────────────────────
describe("T – Name merging edge cases", () => {
  it("T1: full_name takes priority over first+last", () => {
    const results = extract(
      ["full_name", "First Name", "Last Name", "email"],
      [{ full_name: "Grace Hopper", "First Name": "Jane", "Last Name": "Doe", email: "g@x.com" }]
    );
    // full_name is a direct alias for 'name', should win
    expect(results[0].name).toBe("Grace Hopper");
  });

  it("T2: both first and last missing → name stays empty", () => {
    const results = extract(
      ["First Name", "Last Name", "email"],
      [{ "First Name": "", "Last Name": "", email: "t@x.com" }]
    );
    expect(results[0].name).toBe("");
  });

  it("T3: first name with special chars merged correctly", () => {
    const results = extract(
      ["First Name", "Last Name", "email"],
      [{ "First Name": "José", "Last Name": "García", email: "jose@x.com" }]
    );
    expect(results[0].name).toBe("José García");
  });

  it("T4: only last name provided, no first", () => {
    const results = extract(
      ["First Name", "Last Name", "email"],
      [{ "First Name": "", "Last Name": "Tesla", email: "t@x.com" }]
    );
    expect(results[0].name).toBe("Tesla");
  });

  it("T5: name with formula injection in first name field", () => {
    const results = extract(
      ["First Name", "Last Name", "email"],
      [{ "First Name": "=DROP", "Last Name": "User", email: "t@x.com" }]
    );
    // merged name gets sanitized by textField
    expect(results[0].name).toMatch(/^'=/);
  });

  it("T6: whitespace-only first name + real last name", () => {
    const results = extract(
      ["First Name", "Last Name", "email"],
      [{ "First Name": "   ", "Last Name": "Kumar", email: "k@x.com" }]
    );
    // "   " trims to "", so only last name
    expect(results[0].name).toBe("Kumar");
  });

  it("T7: three-word name in single full_name column preserved", () => {
    const results = extract(
      ["full_name", "email"],
      [{ full_name: "Mary Jane Watson", email: "mj@x.com" }]
    );
    expect(results[0].name).toBe("Mary Jane Watson");
  });
});
