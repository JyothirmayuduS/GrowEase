"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { QualityPieChart } from "@/components/ui/quality-pie-chart";
import { RowStateBadge } from "@/components/ui/row-state-badge";
import { useToast } from "@/components/ui/toast";
import { CRM_FIELDS } from "@/lib/constants/crm";
import type { CrmLeadRecord, ImportApiResponse, SkippedRecord } from "@/lib/types/crm";
import {
  assessRecordQuality,
  formatCrmStage,
  type FieldIssue,
  type RecordQuality,
} from "@/lib/validation/record-quality";
import type { QualitySummary, RowState } from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

const FIELD_REASON_LABEL: Partial<Record<keyof CrmLeadRecord, string>> = {
  name: "name",
  email: "email",
  country_code: "country",
  mobile_without_country_code: "mobile",
};

function formatIssueReason(issue: FieldIssue): string {
  const field = FIELD_REASON_LABEL[issue.field] ?? String(issue.field);
  const msg = issue.message.toLowerCase();
  if (msg.includes("missing")) return `${field} missing`;
  if (msg.includes("invalid")) return `${field} invalid`;
  if (msg.includes("suspicious")) return `${field} suspicious`;
  return `${field} ${msg}`;
}

function statusReasonsList(issues: FieldIssue[]): string[] {
  return issues.map(formatIssueReason);
}

interface CrmResultsSectionProps {
  fileName: string;
  result: ImportApiResponse;
  onBack: () => void;
}

type Filter = RowState | "all";

type EnrichedLead = {
  record: CrmLeadRecord;
  quality: RecordQuality;
  index: number;
  state: RowState;
};

function recordsToCsv(records: CrmLeadRecord[]): string {
  const header = CRM_FIELDS.join(",");
  const lines = records.map((record) =>
    CRM_FIELDS.map((field) => `"${(record[field] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSkippedRaw(raw: Record<string, string>): string {
  const entries = Object.entries(raw).filter(([, value]) => value?.trim());
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

export function CrmResultsSection({ fileName, result, onBack }: CrmResultsSectionProps) {
  const { showToast } = useToast();
  const { total, imported, skipped } = result.totals;

  const enriched = useMemo<EnrichedLead[]>(
    () =>
      result.imported.map((record, index) => {
        const quality = assessRecordQuality(record);
        return {
          record,
          quality,
          index,
          state: (quality.flagged ? "needs_review" : "clean") as RowState,
        };
      }),
    [result.imported]
  );

  const summary: QualitySummary = useMemo(
    () => ({
      clean: enriched.filter((r) => r.state === "clean").length,
      needsReview: enriched.filter((r) => r.state === "needs_review").length,
      skipped,
      total,
    }),
    [enriched, skipped, total]
  );

  const avgConfidence = useMemo(() => {
    if (enriched.length === 0) return 0;
    const sum = enriched.reduce((acc, row) => acc + row.quality.confidence, 0);
    return Math.round(sum / enriched.length);
  }, [enriched]);

  const outcome =
    imported === 0 ? "failed" : skipped > 0 || summary.needsReview > 0 ? "partial" : "complete";

  const [filter, setFilter] = useState<Filter>(
    imported === 0 && skipped > 0 ? "skipped" : "all"
  );

  const tableRows = useMemo(() => {
    if (filter === "clean") return enriched.filter((r) => r.state === "clean");
    if (filter === "needs_review") return enriched.filter((r) => r.state === "needs_review");
    if (filter === "skipped") return [];
    return enriched;
  }, [enriched, filter]);

  const handleDownload = () => {
    downloadCsv(recordsToCsv(result.imported), `groweasy-import-${Date.now()}.csv`);
    showToast({
      variant: "success",
      title: "CSV exported",
      description: `${imported} records · ${CRM_FIELDS.length}-field schema`,
    });
  };

  return (
    <LeadSourcesPage title="Import results">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto bg-[var(--ge-page)]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-8 sm:py-8">
          <div className="mb-5 flex flex-col gap-4 border-b border-[var(--ge-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display truncate text-[19px] font-semibold tracking-[-0.01em] text-[var(--ge-text)]">
                {fileName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <OutcomeBadge outcome={outcome} />
                <span className="text-[12px] text-[var(--ge-text-muted)]">·</span>
                <span className="text-[12.5px] text-[var(--ge-text-secondary)]">
                  <b className="font-mono font-semibold text-[var(--ge-text)]">{imported}</b> imported
                </span>
                {summary.needsReview > 0 && (
                  <span className="text-[12.5px] text-[var(--ge-text-secondary)]">
                    <b className="font-mono font-semibold text-[var(--ge-text)]">
                      {summary.needsReview}
                    </b>{" "}
                    need review
                  </span>
                )}
                {skipped > 0 && (
                  <span className="text-[12.5px] text-[var(--ge-text-secondary)]">
                    <b className="font-mono font-semibold text-[var(--ge-text)]">{skipped}</b> skipped
                  </span>
                )}
                <span className="text-[12px] text-[var(--ge-text-muted)]">·</span>
                <span className="text-[12.5px] text-[var(--ge-text-muted)]">
                  {avgConfidence}% avg confidence
                </span>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={onBack}
                className="ge-btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                Import another
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={imported === 0}
                className="ge-btn-primary ge-btn-primary-lg inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                Export csv
              </button>
            </div>
          </div>

          <QualityPieChart
            summary={summary}
            active={filter}
            onSelect={setFilter}
            className="mb-5"
          />

          <div className="overflow-hidden rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)]">
            {filter === "skipped" ? (
              skipped === 0 ? (
                <div className="px-6 py-16 text-center text-[13px] text-[var(--ge-text-secondary)]">
                  No rows were skipped. Every source row mapped into CRM fields.
                </div>
              ) : (
                <SkippedTable rows={result.skipped} />
              )
            ) : tableRows.length === 0 ? (
              <div className="px-6 py-16 text-center text-[13px] text-[var(--ge-text-secondary)]">
                {filter === "needs_review"
                  ? "No rows need review."
                  : filter === "clean"
                    ? "No clean rows in this import."
                    : "No imported records."}
              </div>
            ) : (
              <div className="ge-table-scroll overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                  <caption className="sr-only">
                    Import results. {summary.clean} clean, {summary.needsReview} need review,{" "}
                    {summary.skipped} skipped. Horizontal scroll for more columns.
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-[2] w-[52px] border-b border-r border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]"
                      >
                        #
                      </th>
                      <th
                        scope="col"
                        className="sticky left-[52px] z-[2] w-[240px] min-w-[240px] border-b border-r border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="sticky left-[292px] z-[2] w-[150px] border-b border-r border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]"
                      >
                        Name
                      </th>
                      <Th>Email</Th>
                      <Th>Country</Th>
                      <Th>Mobile</Th>
                      <Th>Company</Th>
                      <Th>City</Th>
                      <Th>State</Th>
                      <Th>Lead owner</Th>
                      <Th last>CRM stage</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => {
                      const { record, quality, index, state } = row;
                      const emailIssue = quality.issues.find((i) => i.field === "email");
                      const mobileIssue = quality.issues.find(
                        (i) => i.field === "mobile_without_country_code"
                      );
                      const codeIssue = quality.issues.find((i) => i.field === "country_code");
                      const nameIssue = quality.issues.find((i) => i.field === "name");
                      const reasons = statusReasonsList(quality.issues);

                      return (
                        <tr
                          key={`${index}-${record.email}-${record.mobile_without_country_code}`}
                          className="group border-b border-[var(--ge-border)] bg-[var(--ge-card)] hover:bg-[var(--ge-panel)]"
                        >
                          <td className="sticky left-0 z-[1] border-r border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-2.5 font-mono text-[12px] tabular-nums text-[var(--ge-text-muted)] group-hover:bg-[var(--ge-panel)]">
                            {index + 1}
                          </td>
                          <td className="sticky left-[52px] z-[1] w-[240px] max-w-[240px] overflow-visible border-r border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-2.5 group-hover:bg-[var(--ge-panel)]">
                            <RowStateBadge state={state} reasons={reasons} />
                          </td>
                          <td className="sticky left-[292px] z-[1] border-r border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-2.5 text-[13px] font-semibold group-hover:bg-[var(--ge-panel)]">
                            <FieldValue
                              value={record.name}
                              issue={nameIssue?.message}
                              emptyAs="—"
                              strong
                            />
                          </td>
                          <Td>
                            <FieldValue value={record.email} issue={emailIssue?.message} mono />
                          </Td>
                          <Td>
                            <FieldValue
                              value={record.country_code}
                              issue={codeIssue?.message}
                              mono
                            />
                          </Td>
                          <Td>
                            <FieldValue
                              value={record.mobile_without_country_code}
                              issue={mobileIssue?.message}
                              mono
                            />
                          </Td>
                          <Td>
                            <FieldValue value={record.company} mono />
                          </Td>
                          <Td>
                            <FieldValue value={record.city} mono />
                          </Td>
                          <Td>
                            <FieldValue value={record.state} mono />
                          </Td>
                          <Td>
                            <FieldValue value={record.lead_owner} mono />
                          </Td>
                          <Td last className="text-[13px] text-[var(--ge-text)]">
                            {record.crm_status ? (
                              formatCrmStage(record.crm_status)
                            ) : (
                              <span className="text-[var(--ge-text-muted)]">—</span>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {summary.needsReview > 0 && filter !== "skipped" && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ge-border)] px-4 py-3.5 text-[12px] text-[var(--ge-text-secondary)]">
                <span>
                  <b className="font-semibold text-[var(--ge-warning)]">{summary.needsReview} rows</b>{" "}
                  imported with low-confidence fields — fix before syncing to CRM.
                </span>
                {filter !== "needs_review" && (
                  <button
                    type="button"
                    onClick={() => setFilter("needs_review")}
                    className="ml-auto font-semibold text-[var(--ge-accent)] hover:underline"
                  >
                    Review all flagged →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </LeadSourcesPage>
  );
}

function OutcomeBadge({ outcome }: { outcome: "complete" | "partial" | "failed" }) {
  if (outcome === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--ge-radius-sm)] border border-[var(--ge-success-border)] bg-[var(--ge-success-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ge-success-on-tint)]">
        <span aria-hidden="true">●</span> Complete
      </span>
    );
  }
  if (outcome === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--ge-radius-sm)] border border-[var(--ge-danger-border)] bg-[var(--ge-danger-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ge-danger-on-tint)]">
        <span aria-hidden="true">●</span> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--ge-radius-sm)] border border-[var(--ge-warning-border)] bg-[var(--ge-warning-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ge-warning-on-tint)]">
      <span aria-hidden="true">●</span> Partial
    </span>
  );
}

/** Single-line cell: colored text when flagged; reason via title/aria only. */
function FieldValue({
  value,
  issue,
  mono,
  strong,
  emptyAs = "—",
}: {
  value: string;
  issue?: string;
  mono?: boolean;
  strong?: boolean;
  emptyAs?: string;
}) {
  const trimmed = value.trim();
  const text = trimmed || emptyAs;
  const flagged = Boolean(issue);

  return (
    <span
      className={cn(
        "block max-w-[220px] truncate text-[13px] leading-5",
        mono && "font-mono",
        strong && "font-semibold",
        flagged
          ? "font-semibold text-[var(--ge-warning-on-tint)]"
          : trimmed
            ? "text-[var(--ge-text)]"
            : "text-[var(--ge-text-muted)]"
      )}
      title={issue}
      aria-label={issue ? `${text}: ${issue}` : undefined}
    >
      {text}
    </span>
  );
}

function Th({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-[var(--ge-border)] bg-[var(--ge-card)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]",
        !last && "border-r border-[var(--ge-border)]"
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  last,
  className,
}: {
  children: React.ReactNode;
  last?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3.5 py-2.5",
        !last && "border-r border-[var(--ge-border)]",
        className
      )}
    >
      {children}
    </td>
  );
}

function SkippedTable({ rows }: { rows: SkippedRecord[] }) {
  return (
    <div className="ge-table-scroll overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">Skipped rows with reasons and source data.</caption>
        <thead>
          <tr>
            <Th>Row #</Th>
            <Th>Reason</Th>
            <Th last>Source data</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rowIndex}
              className="border-b border-[var(--ge-border)] hover:bg-[var(--ge-panel)]"
            >
              <Td className="font-mono text-[13px] text-[var(--ge-text)]">
                {row.rowIndex + 1}
              </Td>
              <Td>
                <span className="inline-flex items-center gap-2">
                  <RowStateBadge state="skipped" reasons={[row.reason]} />
                  <span className="text-[13px] font-semibold text-[var(--ge-danger-on-tint)]">
                    {row.reason}
                  </span>
                </span>
              </Td>
              <Td
                last
                className="max-w-[480px] truncate font-mono text-[12.5px] text-[var(--ge-text-secondary)]"
              >
                {formatSkippedRaw(row.raw)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
