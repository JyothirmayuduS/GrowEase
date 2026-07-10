import { describe, expect, it } from "vitest";

import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";
import { sanitizeCrmRecord, getSkipReason } from "@/lib/validation/crm-record";

/**
 * Exhaustive alias coverage tests.
 * Each "it" block tests one CRM field mapped from a DIFFERENT header variant.
 * All 15 CRM fields are tested across all known aliases.
 */

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function extract(headers: string[], rows: Record<string, string>[]) {
  return heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);
}

// ─────────────────────────────────────────────────
// 1. NAME FIELD ALIASES
// ─────────────────────────────────────────────────
describe("name field aliases", () => {
  const email = "lead@example.com";

  const nameCases: [string, string][] = [
    ["name", "Name column"],
    ["full_name", "Full Name column"],
    ["fullname", "Fullname (no space)"],
    ["contact_name", "Contact Name column"],
    ["lead_name", "Lead Name column"],
    ["customer_name", "Customer Name column"],
    ["naam", "Naam (Dutch/Telugu phonetic)"],
    ["prospect_name", "Prospect Name column"],
  ];

  for (const [header, label] of nameCases) {
    it(`maps "${header}" → name (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Ravi Kumar", email }]);
      expect(results[0].name).toBe("Ravi Kumar");
    });
  }

  it("merges First Name + Last Name when both present", () => {
    const results = extract(["First Name", "Last Name", "email"], [
      { "First Name": "Grace", "Last Name": "Hopper", email },
    ]);
    expect(results[0].name).toBe("Grace Hopper");
  });

  it("merges firstname + lastname (no spaces)", () => {
    const results = extract(["firstname", "lastname", "email"], [
      { firstname: "Alan", lastname: "Turing", email },
    ]);
    expect(results[0].name).toBe("Alan Turing");
  });

  it("uses only first name when last is empty", () => {
    const results = extract(["First Name", "Last Name", "email"], [
      { "First Name": "Ada", "Last Name": "", email },
    ]);
    expect(results[0].name).toBe("Ada");
  });

  it("uses only last name when first is empty", () => {
    const results = extract(["First Name", "Last Name", "email"], [
      { "First Name": "", "Last Name": "Lovelace", email },
    ]);
    expect(results[0].name).toBe("Lovelace");
  });

  it("uses given_name column as first name part", () => {
    const results = extract(["given_name", "surname", "email"], [
      { given_name: "John", surname: "Nash", email },
    ]);
    expect(results[0].name).toBe("John Nash");
  });

  it("uses fname + lname columns", () => {
    const results = extract(["fname", "lname", "email"], [
      { fname: "Nikola", lname: "Tesla", email },
    ]);
    expect(results[0].name).toBe("Nikola Tesla");
  });
});

// ─────────────────────────────────────────────────
// 2. EMAIL FIELD ALIASES
// ─────────────────────────────────────────────────
describe("email field aliases", () => {
  const phone = "9876543210";

  const emailCases: [string, string][] = [
    ["email", "standard email"],
    ["email_address", "email_address"],
    ["e_mail", "e_mail (underscore)"],
    ["mail", "mail"],
    ["mail_id", "mail_id"],
    ["email_id", "email_id"],
    ["work_email", "work_email"],
    ["primary_email", "primary_email"],
  ];

  for (const [header, label] of emailCases) {
    it(`maps "${header}" → email (${label})`, () => {
      const results = extract([header, "phone"], [{ [header]: "test@example.com", phone }]);
      expect(results[0].email).toBe("test@example.com");
    });
  }

  it("takes only first from semicolon-separated emails", () => {
    const results = extract(["email", "phone"], [{ email: "a@b.com; c@d.com", phone }]);
    expect(results[0].email).toBe("a@b.com");
    expect(results[0].crm_note).toContain("c@d.com");
  });

  it("takes only first from pipe-separated emails", () => {
    const results = extract(["email", "phone"], [{ email: "a@b.com | c@d.com", phone }]);
    expect(results[0].email).toBe("a@b.com");
  });
});

// ─────────────────────────────────────────────────
// 3. PHONE FIELD ALIASES
// ─────────────────────────────────────────────────
describe("phone field aliases", () => {
  const email = "lead@example.com";

  const phoneCases: [string, string][] = [
    ["mobile", "mobile"],
    ["phone", "phone"],
    ["phone_number", "phone_number"],
    ["mobile_number", "mobile_number"],
    ["contact_number", "contact_number"],
    ["mob", "mob (WhatsApp shorthand)"],
    ["whatsapp", "whatsapp"],
    ["whatsapp_number", "whatsapp_number"],
    ["whatsapp_no", "whatsapp_no"],
    ["wa_number", "wa_number"],
    ["cell", "cell"],
    ["cellphone", "cellphone"],
    ["primary_phone", "primary_phone"],
  ];

  for (const [header, label] of phoneCases) {
    it(`maps "${header}" → mobile (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "9876543210", email }]);
      expect(results[0].mobile_without_country_code).toBe("9876543210");
    });
  }

  it("extracts country code from +91 prefix", () => {
    const results = extract(["phone", "email"], [{ phone: "+91-9876543210", email }]);
    expect(results[0].country_code).toBe("+91");
    expect(results[0].mobile_without_country_code).toBe("9876543210");
  });

  it("appends extra phones to crm_note", () => {
    const results = extract(["mobile", "email"], [{ mobile: "9001234567 | 9001234568", email }]);
    expect(results[0].mobile_without_country_code).toBe("9001234567");
    expect(results[0].crm_note).toContain("9001234568");
  });
});

// ─────────────────────────────────────────────────
// 4. COMPANY FIELD ALIASES
// ─────────────────────────────────────────────────
describe("company field aliases", () => {
  const email = "lead@example.com";
  const companyCases: [string, string][] = [
    ["company", "company"],
    ["organization", "organization"],
    ["org", "org"],
    ["organisation", "organisation (British)"],
    ["business", "business"],
    ["company_name", "company_name"],
    ["account_name", "account_name (Salesforce-style)"],
  ];

  for (const [header, label] of companyCases) {
    it(`maps "${header}" → company (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Acme Corp", email }]);
      expect(results[0].company).toBe("Acme Corp");
    });
  }
});

// ─────────────────────────────────────────────────
// 5. CITY FIELD ALIASES
// ─────────────────────────────────────────────────
describe("city field aliases", () => {
  const email = "lead@example.com";
  const cityCases: [string, string][] = [
    ["city", "city"],
    ["city_name", "city_name"],
    ["location", "location"],
    ["town", "town"],
    ["locality", "locality"],
  ];

  for (const [header, label] of cityCases) {
    it(`maps "${header}" → city (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Hyderabad", email }]);
      expect(results[0].city).toBe("Hyderabad");
    });
  }
});

// ─────────────────────────────────────────────────
// 6. STATE FIELD ALIASES
// ─────────────────────────────────────────────────
describe("state field aliases", () => {
  const email = "lead@example.com";
  const stateCases: [string, string][] = [
    ["state", "state"],
    ["state_name", "state_name"],
    ["province", "province"],
    ["region", "region"],
  ];

  for (const [header, label] of stateCases) {
    it(`maps "${header}" → state (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Telangana", email }]);
      expect(results[0].state).toBe("Telangana");
    });
  }
});

// ─────────────────────────────────────────────────
// 7. LEAD OWNER ALIASES
// ─────────────────────────────────────────────────
describe("lead_owner field aliases", () => {
  const email = "lead@example.com";
  const ownerCases: [string, string][] = [
    ["lead_owner", "lead_owner"],
    ["owner", "owner"],
    ["assigned_to", "assigned_to"],
    ["sales_rep", "sales_rep"],
    ["agent", "agent"],
    ["owner_name", "owner_name"],
    ["handled_by", "handled_by"],
  ];

  for (const [header, label] of ownerCases) {
    it(`maps "${header}" → lead_owner (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "sales@crm.com", email }]);
      expect(results[0].lead_owner).toBe("sales@crm.com");
    });
  }
});

// ─────────────────────────────────────────────────
// 8. CRM STATUS ALIASES + SYNONYMS
// ─────────────────────────────────────────────────
describe("crm_status field aliases and synonyms", () => {
  const email = "lead@example.com";

  const statusHeaderCases: [string, string][] = [
    ["status", "status"],
    ["lead_status", "lead_status"],
    ["crm_status", "crm_status"],
    ["stage", "stage"],
    ["pipeline", "pipeline"],
    ["pipeline_status", "pipeline_status"],
  ];

  for (const [header, label] of statusHeaderCases) {
    it(`maps header "${header}" → crm_status`, () => {
      const results = extract([header, "email"], [{ [header]: "hot", email }]);
      expect(results[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    });
  }

  const statusValueCases: [string, string][] = [
    ["hot", "GOOD_LEAD_FOLLOW_UP"],
    ["Hot Lead", "GOOD_LEAD_FOLLOW_UP"],
    ["warm", "GOOD_LEAD_FOLLOW_UP"],
    ["callback", "GOOD_LEAD_FOLLOW_UP"],
    ["interested", "GOOD_LEAD_FOLLOW_UP"],
    ["follow up", "GOOD_LEAD_FOLLOW_UP"],
    ["prospect", "GOOD_LEAD_FOLLOW_UP"],
    ["DNC", "DID_NOT_CONNECT"],
    ["not reachable", "DID_NOT_CONNECT"],
    ["busy", "DID_NOT_CONNECT"],
    ["ringing", "DID_NOT_CONNECT"],
    ["switched off", "DID_NOT_CONNECT"],
    ["wrong number", "BAD_LEAD"],
    ["not interested", "BAD_LEAD"],
    ["junk", "BAD_LEAD"],
    ["fake lead", "BAD_LEAD"],
    ["booked", "SALE_DONE"],
    ["closed", "SALE_DONE"],
    ["deal done", "SALE_DONE"],
    ["token done", "SALE_DONE"],
    ["converted", "SALE_DONE"],
  ];

  for (const [value, expected] of statusValueCases) {
    it(`normalizes status value "${value}" → ${expected}`, () => {
      const results = extract(["status", "email"], [{ status: value, email }]);
      expect(results[0].crm_status).toBe(expected);
    });
  }
});

// ─────────────────────────────────────────────────
// 9. DATA SOURCE ALIASES + PROJECT SYNONYMS
// ─────────────────────────────────────────────────
describe("data_source field aliases and project synonyms", () => {
  const email = "lead@example.com";

  const sourceHeaderCases: [string, string][] = [
    ["source", "source"],
    ["lead_source", "lead_source"],
    ["project", "project"],
    ["project_name", "project_name"],
    ["builder_project", "builder_project"],
    ["campaign", "campaign"],
    ["ad_name", "ad_name"],
    ["form_name", "form_name"],
    ["platform", "platform"],
    ["data_source", "data_source"],
  ];

  for (const [header, label] of sourceHeaderCases) {
    it(`maps header "${header}" → data_source`, () => {
      const results = extract([header, "email"], [{ [header]: "Meridian Tower", email }]);
      expect(results[0].data_source).toBe("meridian_tower");
    });
  }

  const projectSynonymCases: [string, string][] = [
    ["meridian tower", "meridian_tower"],
    ["Meridian", "meridian_tower"],
    ["LOD", "leads_on_demand"],
    ["leads on demand", "leads_on_demand"],
    ["Eden Park", "eden_park"],
    ["Eden", "eden_park"],
    ["Varah Swamy", "varah_swamy"],
    ["varah", "varah_swamy"],
    ["sarjapur road", "sarjapur_plots"],
    ["sarjapur plots", "sarjapur_plots"],
  ];

  for (const [value, expected] of projectSynonymCases) {
    it(`normalizes project "${value}" → ${expected}`, () => {
      const results = extract(["source", "email"], [{ source: value, email }]);
      expect(results[0].data_source).toBe(expected);
    });
  }

  it("appends unknown source to crm_note", () => {
    const results = extract(["source", "email"], [{ source: "Unknown Campaign X", email }]);
    expect(results[0].data_source).toBe("");
    expect(results[0].crm_note).toContain("Source: Unknown Campaign X");
  });
});

// ─────────────────────────────────────────────────
// 10. NOTE FIELD ALIASES
// ─────────────────────────────────────────────────
describe("crm_note field aliases", () => {
  const email = "lead@example.com";
  const noteCases: [string, string][] = [
    ["note", "note"],
    ["notes", "notes"],
    ["comments", "comments"],
    ["remark", "remark"],
    ["remarks", "remarks"],
    ["comment", "comment"],
    ["follow_up", "follow_up"],
    ["followup", "followup"],
    ["agent_notes", "agent_notes"],
  ];

  for (const [header, label] of noteCases) {
    it(`maps "${header}" → crm_note (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Call after 6PM", email }]);
      expect(results[0].crm_note).toContain("Call after 6PM");
    });
  }
});

// ─────────────────────────────────────────────────
// 11. POSSESSION TIME ALIASES
// ─────────────────────────────────────────────────
describe("possession_time field aliases", () => {
  const email = "lead@example.com";
  const possCases: [string, string][] = [
    ["possession_time", "possession_time"],
    ["property_possession", "property_possession"],
    ["possession", "possession"],
    ["handover", "handover"],
    ["possession_date", "possession_date"],
    ["ready_by", "ready_by"],
    ["possesion", "possesion (typo)"],
  ];

  for (const [header, label] of possCases) {
    it(`maps "${header}" → possession_time (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Q3 2027", email }]);
      expect(results[0].possession_time).toBe("Q3 2027");
    });
  }
});

// ─────────────────────────────────────────────────
// 12. DESCRIPTION / EXTRA INFO ALIASES
// ─────────────────────────────────────────────────
describe("description field aliases", () => {
  const email = "lead@example.com";
  const descCases: [string, string][] = [
    ["description", "description"],
    ["extra_info", "extra_info"],
    ["details", "details"],
    ["additional_info", "additional_info"],
    ["message", "message"],
  ];

  for (const [header, label] of descCases) {
    it(`maps "${header}" → description (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "Corner unit preferred", email }]);
      expect(results[0].description).toBe("Corner unit preferred");
    });
  }
});

// ─────────────────────────────────────────────────
// 13. CREATED_AT ALIASES
// ─────────────────────────────────────────────────
describe("created_at field aliases", () => {
  const email = "lead@example.com";
  const dateCases: [string, string][] = [
    ["created_at", "created_at"],
    ["created", "created"],
    ["date", "date"],
    ["timestamp", "timestamp"],
    ["created_date", "created_date"],
    ["submitted_at", "submitted_at"],
    ["form_submit_time", "form_submit_time"],
  ];

  for (const [header, label] of dateCases) {
    it(`maps "${header}" → created_at (${label})`, () => {
      const results = extract([header, "email"], [{ [header]: "2026-06-01 09:00:00", email }]);
      expect(results[0].created_at).toBe("2026-06-01 09:00:00");
    });
  }

  it("blanks an invalid date", () => {
    const results = extract(["date", "email"], [{ date: "not-a-date", email }]);
    expect(results[0].created_at).toBe("");
  });
});

// ─────────────────────────────────────────────────
// 14. TYPO / FUZZY HEADER MATCHING (end-to-end)
// ─────────────────────────────────────────────────
describe("fuzzy/typo header matching end-to-end", () => {
  it("resolves heavily misspelled headers from heavy-typos.csv scenario", () => {
    const headers = [
      "Prspct Nam",      // → name (fuzzy)
      "Emial Adress",    // → email (fuzzy: emial ≈ email)
      "Phne Numbr",      // → mobile (fuzzy: phne ≈ phone)
      "Compny",          // → company (fuzzy: compny ≈ company)
      "Cty",             // → city (fuzzy: cty ≈ city)
      "Stauts",          // → crm_status (fuzzy: stauts ≈ status)
      "Soruce",          // → data_source (exact alias)
      "Possesion Tm",    // → possession_time (fuzzy: possesion ≈ possession)
    ];
    const rows = [{
      "Prspct Nam": "Deepak Joshi",
      "Emial Adress": "deepak.j@test.com",
      "Phne Numbr": "9876001234",
      "Compny": "BuildMax",
      "Cty": "Jaipur",
      "Stauts": "hot",
      "Soruce": "Meridian Tower",
      "Possesion Tm": "Q3 2027",
    }];

    const results = extract(headers, rows);
    expect(results[0].email).toBe("deepak.j@test.com");
    expect(results[0].mobile_without_country_code).toBe("9876001234");
    expect(results[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(results[0].data_source).toBe("meridian_tower");
    expect(results[0].possession_time).toBe("Q3 2027");
  });
});

// ─────────────────────────────────────────────────
// 15. FULL CSV ALIAS-VARIANTS SCENARIO
// ─────────────────────────────────────────────────
describe("full alias-variants.csv scenario", () => {
  it("maps all secondary alias headers correctly", () => {
    const headers = [
      "contact_name",
      "primary_email",
      "whatsapp_no",
      "account_name",
      "locality",
      "region",
      "country_name",
      "sales_rep",
      "pipeline_status",
      "follow_up",
      "form_name",
      "handover",
      "message",
      "form_submit_time",
    ];
    const rows = [{
      contact_name: "Vikram Bose",
      primary_email: "vikram.b@crm.in",
      whatsapp_no: "+91-9123456789",
      account_name: "InfraPlus",
      locality: "Electronic City",
      region: "Karnataka",
      country_name: "India",
      sales_rep: "rep1@crm.in",
      pipeline_status: "GOOD_LEAD_FOLLOW_UP",
      follow_up: "Site visit confirmed",
      form_name: "Sarjapur plots",
      handover: "Q2 2027",
      message: "Wants detailed brochure",
      form_submit_time: "2026-06-15 08:00:00",
    }];

    const results = extract(headers, rows);
    expect(results[0].name).toBe("Vikram Bose");
    expect(results[0].email).toBe("vikram.b@crm.in");
    expect(results[0].mobile_without_country_code).toBe("9123456789");
    expect(results[0].country_code).toBe("+91");
    expect(results[0].company).toBe("InfraPlus");
    expect(results[0].city).toBe("Electronic City");
    expect(results[0].state).toBe("Karnataka");
    expect(results[0].country).toBe("India");
    expect(results[0].lead_owner).toBe("rep1@crm.in");
    expect(results[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(results[0].crm_note).toContain("Site visit confirmed");
    expect(results[0].data_source).toBe("sarjapur_plots");
    expect(results[0].possession_time).toBe("Q2 2027");
    expect(results[0].description).toBe("Wants detailed brochure");
    expect(results[0].created_at).toBe("2026-06-15 08:00:00");
    expect(getSkipReason(results[0])).toBeNull();
  });
});
