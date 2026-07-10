import { describe, expect, it } from "vitest";
import { heuristicExtractBatch } from "@/lib/ai/heuristic-extract";
import { sanitizeCrmRecord, getSkipReason } from "@/lib/validation/crm-record";

describe("Comprehensive CSV Import Scenarios", () => {
  
  it("Scenario 1: Facebook Lead Export", () => {
    const headers = [
      "created_at",
      "full_name",
      "email_address",
      "phone",
      "organization",
      "city_name",
      "state_name",
      "country_name",
      "owner",
      "status",
      "notes",
      "source",
      "property_possession",
      "extra_info"
    ];
    const rows = [
      {
        created_at: "2026-05-13 14:20:48",
        full_name: "John Doe",
        email_address: "john.doe@example.com",
        phone: "+91-9876543210",
        organization: "GrowEasy",
        city_name: "Mumbai",
        state_name: "Maharashtra",
        country_name: "India",
        owner: "test@gmail.com",
        status: "good lead follow up",
        notes: "Client wants demo next week",
        source: "facebook ads",
        property_possession: "Q1 2027",
        extra_info: "Interested in 2BHK"
      },
      {
        created_at: "2026-05-13 14:25:30",
        full_name: "Sarah Johnson",
        email_address: "sarah@work.com; sarah.personal@gmail.com",
        phone: "9876543211",
        organization: "Tech Solutions",
        city_name: "Bangalore",
        state_name: "Karnataka",
        country_name: "India",
        owner: "test@gmail.com",
        status: "did not connect",
        notes: "Busy - call back",
        source: "facebook ads",
        property_possession: "",
        extra_info: ""
      }
    ];

    const results = heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);

    // Row 1 Assertions
    expect(results[0].name).toBe("John Doe");
    expect(results[0].email).toBe("john.doe@example.com");
    expect(results[0].mobile_without_country_code).toBe("9876543210");
    expect(results[0].country_code).toBe("+91");
    expect(results[0].company).toBe("GrowEasy");
    expect(results[0].city).toBe("Mumbai");
    expect(results[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(results[0].crm_note).toBe("Client wants demo next week | Source: facebook ads");
    expect(results[0].data_source).toBe(""); // Not one of allowed: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots (so blanked, but note appends "Source: facebook ads")
    expect(results[0].crm_note).toContain("Source: facebook ads");

    // Row 2 Assertions (Multiple Emails)
    expect(results[1].name).toBe("Sarah Johnson");
    expect(results[1].email).toBe("sarah@work.com");
    expect(results[1].crm_note).toContain("Extra emails: sarah.personal@gmail.com");
    expect(results[1].crm_status).toBe("DID_NOT_CONNECT");
  });

  it("Scenario 2: Google Ads Export with Typo Headers", () => {
    const headers = [
      "Clck Id",
      "Lead Nme",
      "Emial",
      "Phne",
      "Ad Group",
      "Status"
    ];
    const rows = [
      {
        "Clck Id": "gclid_12345",
        "Lead Nme": "Amit Kumar",
        "Emial": "amit.k@gmail.com",
        "Phne": "+91 9988776655",
        "Ad Group": "Search_Campaign",
        "Status": "Hot Lead"
      }
    ];

    const results = heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);

    expect(results[0].name).toBe("Amit Kumar");
    expect(results[0].email).toBe("amit.k@gmail.com");
    expect(results[0].mobile_without_country_code).toBe("9988776655");
    expect(results[0].country_code).toBe("+91");
    expect(results[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("Scenario 3: WhatsApp Agent Sheet", () => {
    const headers = [
      "Naam",
      "Mob",
      "Mail id",
      "City",
      "Project",
      "Possession",
      "Remarks",
      "Status"
    ];
    const rows = [
      {
        Naam: "Ramesh K",
        Mob: "9848011111",
        "Mail id": "ramesh.k@yahoo.com",
        City: "Hyd",
        Project: "Meridian",
        Possession: "Ready to move",
        Remarks: "WhatsApp fwd",
        Status: "good lead"
      },
      {
        Naam: "Lakshmi Devi",
        Mob: "9000012345 | 9000098765",
        "Mail id": "",
        City: "Vizag",
        Project: "Sarjapur plots",
        Possession: "Q4 2026",
        Remarks: "Husband will decide",
        Status: "follow up"
      }
    ];

    const results = heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);

    // Ramesh
    expect(results[0].name).toBe("Ramesh K");
    expect(results[0].email).toBe("ramesh.k@yahoo.com");
    expect(results[0].mobile_without_country_code).toBe("9848011111");
    expect(results[0].data_source).toBe("meridian_tower");
    expect(results[0].possession_time).toBe("Ready to move");
    expect(results[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");

    // Lakshmi (Multiple Phones)
    expect(results[1].name).toBe("Lakshmi Devi");
    expect(results[1].mobile_without_country_code).toBe("9000012345");
    expect(results[1].crm_note).toContain("Extra phones: 9000098765");
    expect(results[1].data_source).toBe("sarjapur_plots");
    expect(results[1].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("Scenario 4: CSV Injection and Newline Escaping", () => {
    const headers = ["Name", "Email", "Phone", "Notes"];
    const rows = [
      {
        Name: "=CMD()",
        Email: "hacker@test.com",
        Phone: "9900990099",
        Notes: "Line 1\nLine 2\r\nLine 3"
      }
    ];

    const results = heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);

    expect(results[0].name).toBe("'=CMD()"); // Formula injection protection
    expect(results[0].crm_note).toBe("Line 1\\nLine 2\\nLine 3"); // Newlines escaped
  });

  it("Scenario 5: Skip Invalid Records", () => {
    const headers = ["Name", "Email", "Phone", "Notes"];
    const rows = [
      {
        Name: "Valid Email Lead",
        Email: "valid@email.com",
        Phone: "",
        Notes: ""
      },
      {
        Name: "Valid Phone Lead",
        Email: "",
        Phone: "9876543210",
        Notes: ""
      },
      {
        Name: "Invalid Lead",
        Email: "",
        Phone: "",
        Notes: "Has neither email nor phone"
      }
    ];

    const results = heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);

    expect(getSkipReason(results[0])).toBeNull(); // Import
    expect(getSkipReason(results[1])).toBeNull(); // Import
    expect(getSkipReason(results[2])).toBe("Record has neither email nor mobile number"); // Skip
  });

  it("Scenario 6: First Name and Last Name Merging", () => {
    const headers = ["First Name", "Last Name", "Email", "Phone"];
    const rows = [
      {
        "First Name": "Grace",
        "Last Name": "Hopper",
        Email: "grace@computer.org",
        Phone: "1234567890"
      },
      {
        "First Name": "Alan",
        "Last Name": "",
        Email: "alan@turing.org",
        Phone: "1234567891"
      },
      {
        "First Name": "",
        "Last Name": "Lovelace",
        Email: "ada@lovelace.org",
        Phone: "1234567892"
      }
    ];

    const results = heuristicExtractBatch(headers, rows).map(sanitizeCrmRecord);

    expect(results[0].name).toBe("Grace Hopper");
    expect(results[1].name).toBe("Alan");
    expect(results[2].name).toBe("Lovelace");
  });
});
