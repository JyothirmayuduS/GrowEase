import type { RowAssessment, RowState } from "@/lib/validation/row-quality";
import type { FieldIssue } from "@/lib/validation/record-quality";
import type { SkippedRecord } from "@/lib/types/crm";

export type IssueCount = { label: string; count: number };

export type StatusBreakdown = Record<
  Exclude<RowState, never>,
  { count: number; issues: IssueCount[] }
>;

function bump(map: Map<string, number>, label: string) {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function toSortedIssues(map: Map<string, number>): IssueCount[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Aggregate preview flag labels for pie hover tooltips. */
export function breakdownFromPreview(assessments: RowAssessment[]): StatusBreakdown {
  const cleanIssues = new Map<string, number>();
  const reviewIssues = new Map<string, number>();
  const skippedIssues = new Map<string, number>();
  let clean = 0;
  let needsReview = 0;
  let skipped = 0;

  for (const a of assessments) {
    if (a.state === "clean") {
      clean += 1;
    } else if (a.state === "needs_review") {
      needsReview += 1;
      for (const flag of a.flags) bump(reviewIssues, flag.label);
    } else {
      skipped += 1;
      bump(skippedIssues, a.flags[0]?.label ?? (a.summary || "Skipped"));
    }
  }

  return {
    clean: {
      count: clean,
      issues:
        clean > 0
          ? [{ label: "Ready to import — no flags", count: clean }]
          : [],
    },
    needs_review: { count: needsReview, issues: toSortedIssues(reviewIssues) },
    skipped: { count: skipped, issues: toSortedIssues(skippedIssues) },
  };
}

function formatResultIssue(issue: FieldIssue): string {
  const field =
    issue.field === "mobile_without_country_code"
      ? "mobile"
      : issue.field === "country_code"
        ? "country"
        : String(issue.field);
  const msg = issue.message.toLowerCase();
  if (msg.includes("missing")) return `${field} missing`;
  if (msg.includes("invalid")) return `${field} invalid`;
  if (msg.includes("suspicious")) return `${field} suspicious`;
  return `${field} ${msg}`;
}

/** Aggregate mapped CRM issues + skip reasons for pie hover tooltips. */
export function breakdownFromResults(
  rows: { state: RowState; issues: FieldIssue[] }[],
  skipped: SkippedRecord[]
): StatusBreakdown {
  const cleanIssues = new Map<string, number>();
  const reviewIssues = new Map<string, number>();
  const skippedIssues = new Map<string, number>();
  let clean = 0;
  let needsReview = 0;

  for (const row of rows) {
    if (row.state === "clean") {
      clean += 1;
    } else {
      needsReview += 1;
      for (const issue of row.issues) bump(reviewIssues, formatResultIssue(issue));
    }
  }

  for (const row of skipped) {
    bump(skippedIssues, row.reason || "Skipped");
  }

  return {
    clean: {
      count: clean,
      issues:
        clean > 0
          ? [{ label: "Mapped cleanly — no contact issues", count: clean }]
          : [],
    },
    needs_review: { count: needsReview, issues: toSortedIssues(reviewIssues) },
    skipped: { count: skipped.length, issues: toSortedIssues(skippedIssues) },
  };
}
