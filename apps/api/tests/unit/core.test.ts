import { beforeAll, describe, expect, it } from "vitest";

import { TokenEncryptionService } from "../../src/services/security/token-encryption";
import {
  csvSafeCell,
  firstValidEmail,
  isValidEmail,
  normalizeCrmStatus,
  normalizeDataSource,
  normalizePhone,
  parseCreatedAt,
} from "../../src/services/validation/normalize";
import { parseCsvBuffer } from "../../src/services/csv/parse-csv";
import { validateExtractedBatch } from "../../src/services/validation/validate-extracted";
import { HeuristicProvider } from "../../src/services/ai/heuristic-provider";
import { parseJsonLoose } from "../../src/services/ai/prompts";
import { generatePkce } from "../../src/services/security/oauth-state";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY =
    process.env.TOKEN_ENCRYPTION_KEY || "test-encryption-key-32bytes-min!!";
  process.env.OAUTH_STATE_SECRET =
    process.env.OAUTH_STATE_SECRET || "test-oauth-state-secret-32b!!";
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "service";
});

describe("CSV parser", () => {
  it("parses headers and rows", () => {
    const buf = Buffer.from("Name,Email\nAda,ada@example.com\n");
    const parsed = parseCsvBuffer(buf);
    expect(parsed.headers).toEqual(["Name", "Email"]);
    expect(parsed.totalRows).toBe(1);
    expect(parsed.rows[0]?.Email).toBe("ada@example.com");
  });

  it("rejects empty csv", () => {
    expect(() => parseCsvBuffer(Buffer.from("Name,Email\n"))).toThrow();
  });
});

describe("validators", () => {
  it("validates email", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
  });

  it("picks first email and extras", () => {
    const r = firstValidEmail("bad; a@b.com; c@d.com");
    expect(r.primary).toBe("a@b.com");
    expect(r.extras).toEqual(["c@d.com"]);
  });

  it("normalizes phone", () => {
    const p = normalizePhone("+91 98765 43210");
    expect(p.country_code).toBe("+91");
    expect(p.mobile_without_country_code).toBe("9876543210");
  });

  it("parses dates", () => {
    expect(parseCreatedAt("2026-07-10")).toContain("2026-07-10");
    expect(parseCreatedAt("not-a-date")).toBe("");
  });

  it("normalizes crm status and data source", () => {
    expect(normalizeCrmStatus("DNC")).toBe("DID_NOT_CONNECT");
    expect(normalizeDataSource("Meridian Tower")).toBe("meridian_tower");
    expect(normalizeDataSource("unknown project")).toBe("");
  });

  it("protects csv formula injection", () => {
    expect(csvSafeCell("=CMD()")).toBe("'=CMD()");
  });
});

describe("validate extracted batch", () => {
  it("skips missing contact and detects duplicates", () => {
    const emails = new Set<string>();
    const phones = new Set<string>();
    const rows = new Set<string>();
    const result = validateExtractedBatch(
      [
        {
          created_at: "",
          name: "A",
          email: "a@b.com",
          country_code: "",
          mobile_without_country_code: "",
          company: "",
          city: "",
          state: "",
          country: "",
          lead_owner: "",
          crm_status: "",
          crm_note: "",
          data_source: "",
          possession_time: "",
          description: "",
          confidence: 80,
          original_record: { Name: "A" },
        },
        {
          created_at: "",
          name: "B",
          email: "a@b.com",
          country_code: "",
          mobile_without_country_code: "",
          company: "",
          city: "",
          state: "",
          country: "",
          lead_owner: "",
          crm_status: "",
          crm_note: "",
          data_source: "",
          possession_time: "",
          description: "",
          confidence: 80,
          original_record: { Name: "B" },
        },
        {
          created_at: "",
          name: "C",
          email: "",
          country_code: "",
          mobile_without_country_code: "",
          company: "",
          city: "",
          state: "",
          country: "",
          lead_owner: "",
          crm_status: "",
          crm_note: "",
          data_source: "",
          possession_time: "",
          description: "",
          confidence: 10,
          original_record: { Name: "C" },
        },
      ],
      emails,
      phones,
      rows
    );
    expect(result.leads).toHaveLength(1);
    expect(result.skipped.length).toBeGreaterThanOrEqual(2);
  });
});

describe("token encryption", () => {
  it("round-trips", () => {
    const svc = new TokenEncryptionService();
    const enc = svc.encrypt("secret-token-value");
    expect(enc).not.toContain("secret-token-value");
    expect(svc.decrypt(enc)).toBe("secret-token-value");
  });
});

describe("AI helpers", () => {
  it("parses loose json", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("heuristic maps columns", async () => {
    const provider = new HeuristicProvider();
    const mapping = await provider.analyzeColumns({
      headers: ["Full Name", "Email", "Mobile"],
      sampleRows: [{ "Full Name": "Ada", Email: "a@b.com", Mobile: "9876543210" }],
    });
    expect(mapping.mappings.some((m) => m.target_field === "email")).toBe(true);
  });
});

describe("pkce", () => {
  it("generates verifier and challenge", () => {
    const { verifier, challenge } = generatePkce();
    expect(verifier.length).toBeGreaterThan(20);
    expect(challenge.length).toBeGreaterThan(20);
  });
});
