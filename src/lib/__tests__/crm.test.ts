import { describe, expect, it } from "vitest";

import { cleanKey, normalizeCsv } from "@/lib/csv/normalize";
import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";
import {
  applyMultiContactRules,
  splitEmails,
  splitPhones,
} from "@/lib/validation/contact-fields";
import {
  getSkipReason,
  hasContactInfo,
  normalizeAiBatchRecords,
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
    expect(normalizeCrmStatus("good lead follow up").value).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(normalizeCrmStatus("INVALID").value).toBe("");
  });

  it("normalizes data_source to allowed values only", () => {
    expect(normalizeDataSource("Meridian Tower").value).toBe("meridian_tower");
    expect(normalizeDataSource("facebook").value).toBe("");
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

  it("escapes newlines in notes and other text fields", () => {
    const record = sanitizeCrmRecord({
      crm_note: "line1\nline2",
      description: "a\nb",
      name: "Jane\nDoe",
      email: "a@b.com",
    });
    expect(record.crm_note).toBe("line1\\nline2");
    expect(record.description).toBe("a\\nb");
    expect(record.name).toBe("Jane\\nDoe");
  });

  it("blanks unparseable created_at", () => {
    const record = sanitizeCrmRecord({
      email: "a@b.com",
      created_at: "not-a-date",
    });
    expect(record.created_at).toBe("");
  });

  it("keeps parseable created_at", () => {
    const record = sanitizeCrmRecord({
      email: "a@b.com",
      created_at: "2026-05-13 14:20:48",
    });
    // Date is now normalized to ISO 8601
    expect(record.created_at).toMatch(/^2026-05-13/);
    expect(Number.isNaN(new Date(record.created_at).getTime())).toBe(false);
  });

  it("appends extra emails to crm_note", () => {
    const record = sanitizeCrmRecord({
      email: "a@b.com; c@d.com",
      crm_note: "hello",
    });
    expect(record.email).toBe("a@b.com");
    expect(record.crm_note).toContain("Extra emails");
    expect(record.crm_note).toContain("c@d.com");
  });

  it("appends extra phones to crm_note", () => {
    const record = sanitizeCrmRecord({
      email: "a@b.com",
      mobile_without_country_code: "9848012345; 9000000000",
    });
    expect(record.mobile_without_country_code).toBe("9848012345");
    expect(record.crm_note).toContain("Extra phones");
    expect(record.crm_note).toContain("9000000000");
  });

  it("pads short AI batch records to expected count", () => {
    const normalized = normalizeAiBatchRecords([{ email: "a@b.com" }], 3);
    expect(normalized).toHaveLength(3);
  });

  it("rejects non-array AI records", () => {
    expect(() => normalizeAiBatchRecords({}, 2)).toThrow(/records array/);
  });
});

describe("contact-fields helpers", () => {
  it("splits emails", () => {
    expect(splitEmails("a@b.com; c@d.com")).toEqual(["a@b.com", "c@d.com"]);
  });

  it("splits phones", () => {
    expect(splitPhones("111; 222")).toEqual(["111", "222"]);
  });

  it("applyMultiContactRules keeps first email", () => {
    const result = applyMultiContactRules({
      email: "a@b.com | c@d.com",
      mobile_without_country_code: "",
      country_code: "",
      crm_note: "",
    });
    expect(result.email).toBe("a@b.com");
    expect(result.crm_note).toContain("c@d.com");
  });
});

describe("heuristicExtractBatch multi-contact", () => {
  it("maps Facebook-style headers and keeps extra emails in note", () => {
    const records = heuristicExtractBatch(
      ["full_name", "email_address", "phone"],
      [
        {
          full_name: "Sarah",
          email_address: "sarah@work.com; sarah.personal@gmail.com",
          phone: "9876543211",
        },
      ]
    );
    const sanitized = sanitizeCrmRecord(records[0]);
    expect(sanitized.name).toBe("Sarah");
    expect(sanitized.email).toBe("sarah@work.com");
    expect(sanitized.crm_note).toContain("sarah.personal@gmail.com");
    expect(getSkipReason(sanitized)).toBeNull();
  });

  it("skips rows with no contact after mapping", () => {
    const records = heuristicExtractBatch(
      ["Lead Name", "Company"],
      [{ "Lead Name": "Ghost", Company: "EmptyCo" }]
    );
    const sanitized = sanitizeCrmRecord(records[0]);
    expect(getSkipReason(sanitized)).not.toBeNull();
  });

  it("maps Zoho-style CRM export headers and status synonyms", () => {
    const records = heuristicExtractBatch(
      ["Lead Name", "Email", "Mobile", "Lead Status", "Lead Source", "City"],
      [
        {
          "Lead Name": "Ananya Reddy",
          Email: "ananya.reddy@gmail.com",
          Mobile: "9876501234",
          "Lead Status": "Hot Lead",
          "Lead Source": "Meridian Tower",
          City: "Hyderabad",
        },
      ]
    );
    const sanitized = sanitizeCrmRecord(records[0]);
    expect(sanitized.name).toBe("Ananya Reddy");
    expect(sanitized.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(sanitized.data_source).toBe("meridian_tower");
    expect(sanitized.city).toBe("Hyderabad");
  });

  it("maps WhatsApp agent sheet (Naam/Mob/Mail id/Project)", () => {
    const records = heuristicExtractBatch(
      ["Naam", "Mob", "Mail id", "City", "Project", "Possession", "Remarks", "Status"],
      [
        {
          Naam: "Ramesh K",
          Mob: "9848011111",
          "Mail id": "ramesh.k@yahoo.com",
          City: "Hyd",
          Project: "Meridian",
          Possession: "Ready to move",
          Remarks: "WhatsApp fwd",
          Status: "good lead",
        },
      ]
    );
    const sanitized = sanitizeCrmRecord(records[0]);
    expect(sanitized.name).toBe("Ramesh K");
    expect(sanitized.email).toBe("ramesh.k@yahoo.com");
    expect(sanitized.mobile_without_country_code).toBe("9848011111");
    expect(sanitized.data_source).toBe("meridian_tower");
    expect(sanitized.possession_time).toBe("Ready to move");
    expect(sanitized.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("survives typo headers via fuzzy alias match", () => {
    const records = heuristicExtractBatch(
      ["Lead Namee", "Emial", "Phne Number", "Citty", "Lead Stauts", "Soruce", "Possesion"],
      [
        {
          "Lead Namee": "Amit Sharma",
          Emial: "amit.sharma@example.com",
          "Phne Number": "9876543210",
          Citty: "Mumbai",
          "Lead Stauts": "Good Lead Follow Up",
          Soruce: "leads on demand",
          Possesion: "Q2 2027",
        },
      ]
    );
    const sanitized = sanitizeCrmRecord(records[0]);
    expect(sanitized.name).toBe("Amit Sharma");
    expect(sanitized.email).toBe("amit.sharma@example.com");
    expect(sanitized.mobile_without_country_code).toBe("9876543210");
    expect(sanitized.city).toBe("Mumbai");
    expect(sanitized.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(sanitized.data_source).toBe("leads_on_demand");
    expect(sanitized.possession_time).toBe("Q2 2027");
  });

  it("maps LOD / Sarjapur nicknames and multi-phone WhatsApp rows", () => {
    const records = heuristicExtractBatch(
      ["Naam", "Mob", "Project", "Status"],
      [
        {
          Naam: "Fatima",
          Mob: "9123456780 | 9000098765",
          Project: "LOD",
          Status: "hot",
        },
      ]
    );
    const sanitized = sanitizeCrmRecord(records[0]);
    expect(sanitized.data_source).toBe("leads_on_demand");
    expect(sanitized.mobile_without_country_code).toBe("9123456780");
    expect(sanitized.crm_note).toContain("9000098765");
  });
});

describe("status and source synonym coverage", () => {
  it("maps common agent status slang", () => {
    expect(normalizeCrmStatus("callback").value).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(normalizeCrmStatus("DNC").value).toBe("DID_NOT_CONNECT");
    expect(normalizeCrmStatus("wrong number").value).toBe("BAD_LEAD");
    expect(normalizeCrmStatus("booked").value).toBe("SALE_DONE");
    expect(normalizeCrmStatus("Hot Lead").value).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("maps project nicknames used in RE sheets", () => {
    expect(normalizeDataSource("LOD").value).toBe("leads_on_demand");
    expect(normalizeDataSource("Meridian").value).toBe("meridian_tower");
    expect(normalizeDataSource("sarjapur road").value).toBe("sarjapur_plots");
    expect(normalizeDataSource("Varah Swamy").value).toBe("varah_swamy");
    expect(normalizeDataSource("Eden").value).toBe("eden_park");
  });
});

describe("cleanKey", () => {
  it("trims and removes BOM", () => {
    expect(cleanKey("  \uFEFFemail ")).toBe("email");
  });
});
