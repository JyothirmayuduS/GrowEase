import { describe, expect, it } from "vitest";

import { cleanKey, normalizeCsv } from "@/lib/csv/normalize";
import {
  getSkipReason,
  hasContactInfo,
  normalizeCrmStatus,
  normalizeDataSource,
  sanitizeCrmRecord,
} from "@/lib/validation/crm-record";

describe("normalizeCsv", () => {
  it("strips BOM from headers and keys", () => {
    const { headers, rows } = normalizeCsv(["\uFEFFname", "email"], [
      { "\uFEFFname": "John", email: "john@example.com" },
    ]);
    expect(headers).toEqual(["name", "email"]);
    expect(rows[0].name).toBe("John");
  });

  it("derives headers from first row when meta fields missing", () => {
    const { headers } = normalizeCsv([], [{ name: "Jane", phone: "123" }]);
    expect(headers).toEqual(["name", "phone"]);
  });
});

describe("crm-record validation", () => {
  it("normalizes crm_status to allowed values only", () => {
    expect(normalizeCrmStatus("good lead follow up")).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(normalizeCrmStatus("INVALID")).toBe("");
  });

  it("normalizes data_source to allowed values only", () => {
    expect(normalizeDataSource("Meridian Tower")).toBe("meridian_tower");
    expect(normalizeDataSource("facebook")).toBe("");
  });

  it("skips records without email or mobile", () => {
    const record = sanitizeCrmRecord({ name: "No Contact" });
    expect(hasContactInfo(record)).toBe(false);
    expect(getSkipReason(record)).toBe("Record has neither email nor mobile number");
  });

  it("accepts record with email only", () => {
    const record = sanitizeCrmRecord({ email: "test@example.com" });
    expect(getSkipReason(record)).toBeNull();
  });

  it("escapes newlines in notes", () => {
    const record = sanitizeCrmRecord({ crm_note: "line1\nline2", email: "a@b.com" });
    expect(record.crm_note).toBe("line1\\nline2");
  });
});

describe("cleanKey", () => {
  it("trims and removes BOM", () => {
    expect(cleanKey("  \uFEFFemail ")).toBe("email");
  });
});
