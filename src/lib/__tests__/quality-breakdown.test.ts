import { describe, expect, it } from "vitest";

import {
  breakdownFromPreview,
  breakdownFromResults,
} from "@/lib/validation/quality-breakdown";
import type { RowAssessment } from "@/lib/validation/row-quality";

describe("quality-breakdown", () => {
  it("aggregates preview flag labels for needs_review hover", () => {
    const assessments: RowAssessment[] = [
      { state: "clean", flags: [], summary: "ok" },
      {
        state: "needs_review",
        flags: [{ header: "phone", label: "Suspicious phone", kind: "malformed" }],
        summary: "review",
      },
      {
        state: "needs_review",
        flags: [
          { header: "email", label: "Multiple emails", kind: "ambiguous" },
          { header: "name", label: "Missing name", kind: "missing" },
        ],
        summary: "review",
      },
      {
        state: "skipped",
        flags: [{ header: "", label: "Empty row", kind: "empty_row" }],
        summary: "skip",
      },
    ];

    const b = breakdownFromPreview(assessments);
    expect(b.clean.count).toBe(1);
    expect(b.needs_review.count).toBe(2);
    expect(b.skipped.count).toBe(1);
    expect(b.needs_review.issues.map((i) => i.label)).toEqual(
      expect.arrayContaining(["Suspicious phone", "Multiple emails", "Missing name"])
    );
  });

  it("aggregates result field issues for hover", () => {
    const b = breakdownFromResults(
      [
        { state: "clean", issues: [] },
        {
          state: "needs_review",
          issues: [
            { field: "email", message: "missing" },
            { field: "country_code", message: "missing" },
          ],
        },
        {
          state: "needs_review",
          issues: [{ field: "email", message: "missing" }],
        },
      ],
      [{ rowIndex: 9, reason: "Record has neither email nor mobile number", raw: {} }]
    );

    expect(b.needs_review.issues[0]).toEqual({ label: "email missing", count: 2 });
    expect(b.skipped.issues[0].label).toContain("neither email nor mobile");
  });
});
