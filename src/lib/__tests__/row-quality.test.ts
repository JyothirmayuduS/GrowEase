import { describe, expect, it } from "vitest";

import {
  assessPreviewRow,
  assessPreviewRows,
  summarizeAssessments,
} from "@/lib/validation/row-quality";

describe("row-quality preview assessment", () => {
  const headers = ["Full Name", "Email Address", "Phone"];

  it("marks clean rows", () => {
    const result = assessPreviewRow(
      { "Full Name": "Ananya Rao", "Email Address": "a@b.com", Phone: "9848012345" },
      headers
    );
    expect(result.state).toBe("clean");
  });

  it("does not flag commas in notes as multiple values", () => {
    const headersWithNotes = ["Full Name", "Email Address", "Phone", "Notes"];
    const result = assessPreviewRow(
      {
        "Full Name": "Ananya Rao",
        "Email Address": "a@b.com",
        Phone: "9848012345",
        Notes: "Call back, prefers WhatsApp",
      },
      headersWithNotes
    );
    expect(result.state).toBe("clean");
  });

  it("still flags multiple emails with semicolon", () => {
    const result = assessPreviewRow(
      {
        "Full Name": "Sri",
        "Email Address": "a@b.com; c@d.com",
        Phone: "9848012345",
      },
      headers
    );
    expect(result.state).toBe("needs_review");
    expect(result.flags[0]).toEqual(
      expect.objectContaining({ header: "Email Address", label: "Multiple emails" })
    );
  });

  it("flags malformed email", () => {
    const result = assessPreviewRow(
      { "Full Name": "Suresh", "Email Address": "suresh.babu@", Phone: "8055667788" },
      headers
    );
    expect(result.state).toBe("needs_review");
    expect(result.flags.some((f) => f.kind === "malformed")).toBe(true);
  });

  it("binds missing name to the real name column", () => {
    const result = assessPreviewRow(
      { "Full Name": "", "Email Address": "a@b.com", Phone: "9848012345" },
      headers
    );
    expect(result.state).toBe("needs_review");
    expect(result.flags).toEqual([
      expect.objectContaining({ header: "Full Name", label: "Missing name" }),
    ]);
  });

  it("does not flag empty optional alt phone alone", () => {
    const withAlt = ["Full Name", "Email Address", "Phone", "Alt Phone"];
    const result = assessPreviewRow(
      {
        "Full Name": "Ananya Rao",
        "Email Address": "a@b.com",
        Phone: "9848012345",
        "Alt Phone": "",
      },
      withAlt
    );
    expect(result.state).toBe("clean");
  });

  it("skips empty rows", () => {
    const result = assessPreviewRow(
      { "Full Name": "", "Email Address": "", Phone: "" },
      headers
    );
    expect(result.state).toBe("skipped");
  });

  it("skips duplicate rows", () => {
    const rows = [
      { "Full Name": "A", "Email Address": "a@b.com", Phone: "9848012345" },
      { "Full Name": "A", "Email Address": "a@b.com", Phone: "9848012345" },
    ];
    const assessments = assessPreviewRows(headers, rows);
    expect(assessments[0].state).toBe("clean");
    expect(assessments[1].state).toBe("skipped");
    expect(assessments[1].flags[0].kind).toBe("duplicate");
  });

  it("summarizes counts", () => {
    const assessments = assessPreviewRows(headers, [
      { "Full Name": "A", "Email Address": "a@b.com", Phone: "9848012345" },
      { "Full Name": "B", "Email Address": "bad@", Phone: "9848012345" },
      { "Full Name": "", "Email Address": "", Phone: "" },
    ]);
    const summary = summarizeAssessments(assessments);
    expect(summary.total).toBe(3);
    expect(summary.clean).toBe(1);
    expect(summary.needsReview).toBe(1);
    expect(summary.skipped).toBe(1);
  });
});
