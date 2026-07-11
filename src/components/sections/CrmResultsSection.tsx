"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState, useCallback } from "react";
import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";

import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { PageAnnotations } from "@/components/ui/page-annotations";
import { QualityStrip } from "@/components/ui/quality-strip";
import { colStyle, ResizableTh } from "@/components/ui/resizable-th";
import { RowStateBadge } from "@/components/ui/row-state-badge";
import { useToast } from "@/components/ui/toast";
import { useColumnWidths } from "@/hooks/use-column-widths";
import { CRM_FIELDS } from "@/lib/constants/crm";
import type { CrmLeadRecord, ImportApiResponse, SkippedRecord } from "@/lib/types/crm";
import {
  assessRecordQuality,
  formatCrmStage,
  type FieldIssue,
  type RecordQuality,
} from "@/lib/validation/record-quality";
import type { QualitySummary, RowState } from "@/lib/validation/row-quality";
import { generateCsv, generateCsvFilename } from "@/lib/services/CsvExportService";
import { cn } from "@/lib/utils";

const RESULTS_COL_KEYS = [
  "#",
  "__status",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "data_source",
  "possession_time",
  "description",
  "created_at",
  "crm_note",
] as const;

const RESULTS_DEFAULTS: Record<string, number> = {
  "#": 52,
  __status: 180,
  name: 150,
  email: 150,
  country_code: 100,
  mobile_without_country_code: 150,
  company: 150,
  city: 120,
  state: 120,
  country: 120,
  lead_owner: 150,
  crm_status: 160,
  data_source: 140,
  possession_time: 140,
  description: 200,
  created_at: 180,
  crm_note: 300,
};

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
  /** Override the primary back / import-another button label. */
  backLabel?: string;
}

type Filter = RowState | "all";

type EnrichedLead = {
  record: CrmLeadRecord;
  quality: RecordQuality;
  index: number;
  state: RowState;
};

function recordsToCsv(records: CrmLeadRecord[]): string {
  return generateCsv(records);
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

export function CrmResultsSection({
  fileName,
  result,
  onBack,
  backLabel = "Import another",
}: CrmResultsSectionProps) {
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

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  const handleDownload = () => {
    downloadCsv(recordsToCsv(result.imported), generateCsvFilename("groweasy-import"));
    showToast({
      variant: "success",
      title: "CSV exported",
      description: `${imported} records · ${CRM_FIELDS.length}-field schema`,
    });
  };

  const colKeys = useMemo(() => [...RESULTS_COL_KEYS], []);
  const { widths, resize, reset, expand, isExpanded, stickyLeft } = useColumnWidths(
    colKeys,
    RESULTS_DEFAULTS,
    `ge-results-cols:v3`
  );

  const handleExpand = useCallback(() => {
    const customWidths: Record<string, number> = {};
    for (const key of colKeys) {
      let maxLen = key.length;
      for (const item of tableRows) {
        const val =
          key === "#"
            ? String(item.index + 1)
            : key === "__status"
              ? item.state
              : String(item.record[key as keyof CrmLeadRecord] || "");
        if (val.length > maxLen) maxLen = val.length;
      }
      // rough character width estimate: 8px per char + 40px padding
      customWidths[key] = Math.min(Math.max(RESULTS_DEFAULTS[key] || 100, maxLen * 8 + 40), 600);
    }
    expand(customWidths);
  }, [colKeys, tableRows, expand]);

  const totalWidth = useMemo(
    () => colKeys.reduce((acc, key) => acc + (widths[key] ?? RESULTS_DEFAULTS[key] ?? 140), 0),
    [colKeys, widths]
  );

  const stickyOrder = ["#", "__status", "name"];
  const leftHash = 0;
  const leftStatus = stickyLeft(stickyOrder, 1);
  const leftName = stickyLeft(stickyOrder, 2);
  const notesKey = `ge-notes:results:${fileName}`;

  return (
    <LeadSourcesPage title="Import results">
      <div className="ge-scroll-quiet flex min-w-0 flex-1 flex-col bg-[var(--ge-page)] md:min-h-0 md:overflow-auto">
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
                <span className="text-[12px] text-[var(--ge-text-muted)]">·</span>
                <span className="text-[12.5px] text-[var(--ge-text-muted)]">
                  drag column edges to resize
                </span>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <PageAnnotations storageKey={notesKey} />
              <button
                type="button"
                onClick={isExpanded ? reset : handleExpand}
                className="ge-btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
                title={isExpanded ? "Reset column widths" : "Expand column widths"}
              >
                <Columns3 className="h-3.5 w-3.5" aria-hidden />
                {isExpanded ? "Reset columns" : "Expand columns"}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="ge-btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                {backLabel}
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

          <QualityStrip
            summary={summary}
            active={filter}
            onSelect={setFilter}
            className="mb-5"
          />

          <div className="w-full max-w-full overflow-x-auto rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)] md:overflow-hidden">
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
              <div 
                ref={parentRef}
                className="ge-table-scroll max-h-[70vh] overflow-auto"
              >
                <table
                  className="ge-results-table table-fixed"
                  style={{ width: totalWidth }}
                >
                  <caption className="sr-only">
                    Import results. {summary.clean} clean, {summary.needsReview} need review,{" "}
                    {summary.skipped} skipped. Drag column edges to resize.
                  </caption>
                  <thead className="sticky top-0 z-10 bg-[var(--ge-panel)]">
                    <tr>
                      <ResizableTh
                        scope="col"
                        columnKey="#"
                        width={widths["#"]}
                        onResize={resize}
                        className="ge-col-rule xl:sticky z-[2] bg-[var(--ge-panel)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]"
                        style={{ left: leftHash }}
                      >
                        S.No
                      </ResizableTh>
                      <ResizableTh
                        scope="col"
                        columnKey="__status"
                        width={widths.__status}
                        onResize={resize}
                        className="ge-col-rule xl:sticky z-[2] bg-[var(--ge-panel)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]"
                        style={{ left: leftStatus }}
                      >
                        Status
                      </ResizableTh>
                      <ResizableTh
                        scope="col"
                        columnKey="name"
                        width={widths.name}
                        onResize={resize}
                        className="ge-col-rule xl:sticky z-[2] bg-[var(--ge-panel)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]"
                        style={{ left: leftName }}
                      >
                        Name
                      </ResizableTh>
                      {(
                        [
                          ["email", "Email"],
                          ["country_code", "Country Code"],
                          ["mobile_without_country_code", "Mobile"],
                          ["company", "Company"],
                          ["city", "City"],
                          ["state", "State"],
                          ["country", "Country"],
                          ["lead_owner", "Lead Owner"],
                          ["crm_status", "CRM Status"],
                          ["data_source", "Data Source"],
                          ["possession_time", "Possession Time"],
                          ["description", "Description"],
                          ["created_at", "Created At"],
                          ["crm_note", "CRM Note"],
                        ] as const
                      ).map(([key, label], i, arr) => (
                        <ResizableTh
                          key={key}
                          scope="col"
                          columnKey={key}
                          width={widths[key]}
                          onResize={resize}
                          className={cn(
                            "bg-[var(--ge-panel)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]",
                            i === arr.length - 1 ? "ge-col-rule-last" : "ge-col-rule"
                          )}
                        >
                          {label}
                        </ResizableTh>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paddingTop > 0 && (
                      <tr>
                        <td style={{ height: paddingTop }} colSpan={17} />
                      </tr>
                    )}
                    {virtualRows.map((virtualRow) => {
                      const row = tableRows[virtualRow.index];
                      const { record, quality, index, state } = row;
                      const emailIssue = quality.issues.find((i) => i.field === "email");
                      const mobileIssue = quality.issues.find(
                        (i) => i.field === "mobile_without_country_code"
                      );
                      const codeIssue = quality.issues.find((i) => i.field === "country_code");
                      const nameIssue = quality.issues.find((i) => i.field === "name");
                      const reasons = statusReasonsList(quality.issues);
                      const edge =
                        state === "needs_review"
                          ? "border-l-[3px] border-l-[var(--ge-warning)]"
                          : "border-l-[3px] border-l-transparent";

                      return (
                        <tr
                          key={virtualRow.key}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          className="group bg-[var(--ge-card)] hover:bg-[var(--ge-panel)]"
                        >
                          <td
                            className={cn(
                              "ge-col-rule xl:sticky z-[1] bg-[var(--ge-card)] px-3.5 py-2.5 align-top font-mono text-[12px] tabular-nums text-[var(--ge-text-muted)] group-hover:bg-[var(--ge-panel)]",
                              edge
                            )}
                            style={{ ...colStyle(widths["#"]), left: leftHash }}
                          >
                            {index + 1}
                          </td>
                          <td
                            className="ge-col-rule xl:sticky z-[1] overflow-visible bg-[var(--ge-card)] px-3.5 py-2.5 align-top group-hover:bg-[var(--ge-panel)]"
                            style={{ ...colStyle(widths.__status), left: leftStatus }}
                          >
                            <RowStateBadge state={state} variant="plain" reasons={reasons} />
                          </td>
                          <td
                            className="ge-col-rule xl:sticky z-[1] bg-[var(--ge-card)] px-3.5 py-2.5 align-top text-[13px] font-semibold group-hover:bg-[var(--ge-panel)]"
                            style={{ ...colStyle(widths.name), left: leftName }}
                          >
                            <FieldValue
                              value={record.name}
                              issue={nameIssue?.message}
                              emptyAs="—"
                              strong
                            />
                          </td>
                          <Td width={widths.email}>
                            <FieldValue value={record.email} issue={emailIssue?.message} mono />
                          </Td>
                          <Td width={widths.country_code}>
                            <FieldValue
                              value={record.country_code}
                              issue={codeIssue?.message}
                              mono
                            />
                          </Td>
                          <Td width={widths.mobile_without_country_code}>
                            <FieldValue
                              value={record.mobile_without_country_code}
                              issue={mobileIssue?.message}
                              mono
                            />
                          </Td>
                          <Td width={widths.company}>
                            <FieldValue value={record.company} mono />
                          </Td>
                          <Td width={widths.city}>
                            <FieldValue value={record.city} mono />
                          </Td>
                          <Td width={widths.state}>
                            <FieldValue value={record.state} mono />
                          </Td>
                          <Td width={widths.country}>
                            <FieldValue value={record.country} mono />
                          </Td>
                          <Td width={widths.lead_owner}>
                            <FieldValue value={record.lead_owner} mono />
                          </Td>
                          <Td width={widths.crm_status} className="text-[13px] text-[var(--ge-text)]">
                            {record.crm_status ? (
                                formatCrmStage(record.crm_status)
                            ) : (
                              <span className="text-[var(--ge-text-muted)]">—</span>
                            )}
                          </Td>
                          <Td width={widths.data_source}>
                            <FieldValue value={record.data_source} mono />
                          </Td>
                          <Td width={widths.possession_time}>
                            <FieldValue value={record.possession_time} mono />
                          </Td>
                          <Td width={widths.description}>
                            <FieldValue value={record.description} />
                          </Td>
                          <Td width={widths.created_at}>
                            <FieldValue value={record.created_at} mono />
                          </Td>
                          <Td last width={widths.crm_note}>
                            <FieldValue value={record.crm_note} />
                          </Td>
                        </tr>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr>
                        <td style={{ height: paddingBottom }} colSpan={17} />
                      </tr>
                    )}
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

/** Full cell text — truncates with … */
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
        "block truncate text-[13px] leading-5",
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
        "whitespace-nowrap bg-[var(--ge-panel)] px-3.5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ge-text-muted)]",
        last ? "ge-col-rule-last" : "ge-col-rule"
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
  width,
}: {
  children: React.ReactNode;
  last?: boolean;
  className?: string;
  width?: number;
}) {
  return (
    <td
      className={cn(
        "align-top px-3.5 py-2.5",
        last ? "ge-col-rule-last" : "ge-col-rule",
        className
      )}
      style={width != null ? colStyle(width) : undefined}
    >
      {children}
    </td>
  );
}

function SkippedTable({ rows }: { rows: SkippedRecord[] }) {
  return (
    <div className="ge-table-scroll max-h-[70vh] overflow-auto">
      <table className="ge-results-table w-full min-w-[720px]">
        <caption className="sr-only">Skipped rows with reasons and source data.</caption>
        <thead className="sticky top-0 z-10 bg-[var(--ge-panel)]">
          <tr>
            <Th>S.No</Th>
            <Th>Reason</Th>
            <Th last>Source data</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowIndex} className="group bg-[var(--ge-card)] hover:bg-[var(--ge-panel)]">
              <Td className="font-mono text-[13px] text-[var(--ge-text)]">
                {row.rowIndex + 1}
              </Td>
              <Td>
                <span className="inline-flex items-center gap-2">
                  <RowStateBadge state="skipped" variant="plain" reasons={[row.reason]} />
                  <span className="text-[13px] font-semibold text-[var(--ge-danger-on-tint)]">
                    {row.reason}
                  </span>
                </span>
              </Td>
              <Td
                last
                className="font-mono text-[12.5px] text-[var(--ge-text-secondary)]"
              >
                <span className="block whitespace-normal break-all">
                  {formatSkippedRaw(row.raw)}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
