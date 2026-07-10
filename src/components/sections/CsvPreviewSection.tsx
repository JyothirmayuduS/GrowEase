"use client";

import { useMemo, useRef, useState } from "react";
import { Columns3, FileSpreadsheet, RefreshCw } from "lucide-react";

import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";
import { ImportPanel } from "@/components/layout/ImportPanel";
import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";
import { PageAnnotations } from "@/components/ui/page-annotations";
import { QualityPieChart } from "@/components/ui/quality-pie-chart";
import { colStyle, ResizableTh } from "@/components/ui/resizable-th";
import { FieldFlagBadge, RowStateBadge } from "@/components/ui/row-state-badge";
import { useColumnWidths } from "@/hooks/use-column-widths";
import type { ParsedCsv } from "@/lib/types/app";
import {
  assessPreviewRows,
  summarizeAssessments,
  type RowState,
} from "@/lib/validation/row-quality";
import { cn } from "@/lib/utils";

interface CsvPreviewSectionProps {
  data: ParsedCsv;
  onConfirm: () => void;
  onBack: () => void;
  onReplaceFile?: (file: File) => void;
  errorMessage?: string | null;
  onRetry?: () => void;
  confirmDisabled?: boolean;
}

type Filter = RowState | "all";

const FIXED_KEYS = ["#", "__status"] as const;

export function CsvPreviewSection({
  data,
  onConfirm,
  onBack,
  onReplaceFile,
  errorMessage,
  onRetry,
  confirmDisabled = false,
}: CsvPreviewSectionProps) {
  const { headers, rows } = data;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const assessments = useMemo(() => assessPreviewRows(headers, rows), [headers, rows]);
  const summary = useMemo(() => summarizeAssessments(assessments), [assessments]);

  const indexed = useMemo(
    () =>
      rows.map((row, index) => ({
        row,
        index,
        assessment: assessments[index],
      })),
    [rows, assessments]
  );

  const visible = useMemo(() => {
    if (filter === "all") return indexed;
    return indexed.filter((item) => item.assessment.state === filter);
  }, [indexed, filter]);

  const stickyHeader = headers[0] ?? "Column";
  const otherHeaders = headers.slice(1);

  const columnKeys = useMemo(
    () => [...FIXED_KEYS, ...headers],
    [headers]
  );

  const defaults = useMemo(() => {
    const d: Record<string, number> = {
      "#": 52,
      __status: 280,
    };
    for (const h of headers) d[h] = h === stickyHeader ? 160 : 140;
    return d;
  }, [headers, stickyHeader]);

  const { widths, resize, reset, stickyLeft } = useColumnWidths(
    columnKeys,
    defaults,
    `ge-preview-cols:${data.fileName}`
  );

  const totalWidth = useMemo(
    () => columnKeys.reduce((acc, key) => acc + (widths[key] ?? defaults[key] ?? 140), 0),
    [columnKeys, widths, defaults]
  );

  const stickyOrder = ["#", "__status", stickyHeader];
  const leftHash = 0;
  const leftStatus = stickyLeft(stickyOrder, 1);
  const leftFirst = stickyLeft(stickyOrder, 2);

  const notesKey = `ge-notes:preview:${data.fileName}`;

  return (
    <LeadSourcesPage
      title="Preview import"
      description={`${summary.total} rows · ${headers.length} columns · drag column edges to resize`}
    >
      <ImportPanel
        footer={
          <>
            <p className="mr-auto hidden max-w-md text-[12px] leading-snug text-[var(--ge-text-secondary)] lg:block">
              AI maps your columns to 14 CRM fields — flagged rows will ask you to confirm a value
              first.
            </p>
            <button type="button" onClick={onBack} className="ge-btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={headers.length === 0 || rows.length === 0 || confirmDisabled}
              onClick={onConfirm}
              className="ge-btn-primary ge-btn-primary-lg"
            >
              {confirmDisabled ? "Importing…" : "Confirm import"}
            </button>
          </>
        }
      >
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[var(--ge-page)] p-0 sm:gap-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[var(--ge-radius-md)] border border-[var(--ge-danger-border)] bg-[var(--ge-danger-tint)] px-4 py-3 text-[13px] text-[var(--ge-danger-on-tint)]"
            >
              <p>
                <span className="font-semibold">Import failed.</span> {errorMessage}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 rounded-[var(--ge-radius-md)] bg-[var(--ge-danger)] px-3 py-1.5 text-[12px] font-semibold text-white"
                >
                  Retry import
                </button>
              )}
            </div>
          )}

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)] px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ge-radius-md)] bg-[var(--ge-success-tint)]">
                <FileSpreadsheet className="h-5 w-5 text-[var(--ge-success)]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[var(--ge-text)]">
                  {data.fileName}
                </p>
                <p className="text-[12px] text-[var(--ge-text-muted)]">
                  {(data.fileSize / 1024).toFixed(2)} KB
                </p>
              </div>
              {onReplaceFile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      e.target.value = "";
                      if (selected instanceof File) onReplaceFile(selected);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Replace CSV file"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--ge-radius-md)] border border-[var(--ge-border-strong)] bg-[var(--ge-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ge-text-secondary)] hover:text-[var(--ge-text)]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Replace
                  </button>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-[var(--ge-radius-md)] border border-[var(--ge-border-strong)] bg-[var(--ge-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ge-text-secondary)] hover:text-[var(--ge-text)]"
                title="Reset column widths"
              >
                <Columns3 className="h-3.5 w-3.5" aria-hidden />
                Reset columns
              </button>
              <PageAnnotations storageKey={notesKey} />
            </div>
          </div>

          <QualityPieChart summary={summary} active={filter} onSelect={setFilter} />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--ge-radius-xl)] border border-[var(--ge-border)] bg-[var(--ge-card)]">
            {headers.length === 0 ? (
              <EmptyPreview />
            ) : visible.length === 0 ? (
              <div className="flex h-40 items-center justify-center px-6 text-center text-[13px] text-[var(--ge-text-secondary)]">
                No rows match this filter. Choose another quality state above.
              </div>
            ) : (
              <div className="ge-table-scroll relative min-h-0 flex-1 overflow-auto">
                <table
                  className="ge-results-table table-fixed text-left"
                  style={{ width: totalWidth, minWidth: "100%" }}
                >
                  <caption className="sr-only">
                    CSV preview with row quality. {summary.clean} clean, {summary.needsReview} need
                    review, {summary.skipped} skipped. Drag column edges to resize.
                  </caption>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[var(--ge-panel)]">
                      <ResizableTh
                        scope="col"
                        columnKey="#"
                        width={widths["#"]}
                        onResize={resize}
                        className="ge-col-rule sticky z-[12] bg-[var(--ge-panel)] px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]"
                        style={{ left: leftHash }}
                      >
                        #
                      </ResizableTh>
                      <ResizableTh
                        scope="col"
                        columnKey="__status"
                        width={widths.__status}
                        onResize={resize}
                        className="ge-col-rule sticky z-[12] bg-[var(--ge-panel)] px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]"
                        style={{ left: leftStatus }}
                      >
                        Status
                      </ResizableTh>
                      <ResizableTh
                        scope="col"
                        columnKey={stickyHeader}
                        width={widths[stickyHeader] ?? 160}
                        onResize={resize}
                        className="ge-col-rule sticky z-[12] bg-[var(--ge-panel)] px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]"
                        style={{ left: leftFirst }}
                      >
                        {stickyHeader}
                      </ResizableTh>
                      {otherHeaders.map((header, i) => (
                        <ResizableTh
                          key={header}
                          scope="col"
                          columnKey={header}
                          width={widths[header] ?? 140}
                          onResize={resize}
                          className={cn(
                            "ge-col-rule whitespace-nowrap px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ge-text-muted)]",
                            i === otherHeaders.length - 1 && "ge-col-rule-last shadow-none"
                          )}
                        >
                          {header}
                        </ResizableTh>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(({ row, index, assessment }) => {
                      if (assessment.state === "skipped") {
                        return (
                          <tr key={index} className="bg-[var(--ge-card)]">
                            <td
                              colSpan={headers.length + 2}
                              className="border-l-[3px] border-l-[var(--ge-danger)] px-4 py-3 text-[13px]"
                            >
                              <span className="inline-flex items-center gap-2">
                                <RowStateBadge
                                  state="skipped"
                                  variant="plain"
                                  reasons={assessment.flags.map((f) => f.label)}
                                />
                                <span className="text-[var(--ge-text-secondary)]">
                                  Row {index + 1}
                                </span>
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      const fieldFlags = assessment.flags.filter(
                        (f) => f.header && headers.includes(f.header)
                      );
                      const primaryFieldFlag = fieldFlags[0];
                      const statusReasons =
                        assessment.state === "needs_review"
                          ? assessment.flags.map((f) => f.label)
                          : undefined;

                      const edge =
                        assessment.state === "needs_review"
                          ? "border-l-[3px] border-l-[var(--ge-warning)]"
                          : "border-l-[3px] border-l-transparent";

                      return (
                        <tr
                          key={index}
                          className="group bg-[var(--ge-card)] hover:bg-[var(--ge-panel)]"
                        >
                          <td
                            className={cn(
                              "ge-col-rule sticky z-[1] bg-[var(--ge-card)] px-3 py-2.5 align-top font-mono text-[12px] tabular-nums text-[var(--ge-text-muted)] group-hover:bg-[var(--ge-panel)]",
                              edge
                            )}
                            style={{ ...colStyle(widths["#"]), left: leftHash }}
                          >
                            {index + 1}
                          </td>
                          <td
                            className="ge-col-rule sticky z-[1] overflow-visible bg-[var(--ge-card)] px-3 py-2.5 align-top group-hover:bg-[var(--ge-panel)]"
                            style={{ ...colStyle(widths.__status), left: leftStatus }}
                          >
                            <RowStateBadge
                              state={assessment.state}
                              variant="plain"
                              reasons={statusReasons}
                            />
                          </td>
                          <td
                            className="ge-col-rule sticky z-[1] bg-[var(--ge-card)] px-3 py-2.5 align-top group-hover:bg-[var(--ge-panel)]"
                            style={{
                              ...colStyle(widths[stickyHeader] ?? 160),
                              left: leftFirst,
                            }}
                          >
                            <PreviewCell
                              value={row[stickyHeader] ?? ""}
                              flag={
                                primaryFieldFlag?.header === stickyHeader
                                  ? primaryFieldFlag
                                  : undefined
                              }
                            />
                          </td>
                          {otherHeaders.map((header, i) => (
                            <td
                              key={header}
                              className={cn(
                                "ge-col-rule px-3 py-2.5 align-top",
                                i === otherHeaders.length - 1 && "shadow-none"
                              )}
                              style={colStyle(widths[header] ?? 140)}
                            >
                              <PreviewCell
                                value={row[header] ?? ""}
                                flag={
                                  primaryFieldFlag?.header === header
                                    ? primaryFieldFlag
                                    : undefined
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ImportPanel>
    </LeadSourcesPage>
  );
}

function PreviewCell({
  value,
  flag,
}: {
  value: string;
  flag?: { label: string };
}) {
  const trimmed = value.trim();
  if (!trimmed && !flag) {
    return <span className="text-[12.5px] italic text-[var(--ge-text-muted)]">—</span>;
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {trimmed ? (
        <span className="truncate font-mono text-[12.5px] leading-5 text-[var(--ge-text)]" title={trimmed}>
          {trimmed}
        </span>
      ) : null}
      {flag ? <FieldFlagBadge label={flag.label} /> : null}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex h-48 flex-col items-center justify-center px-6 text-center">
      <p className="text-[14px] font-semibold text-[var(--ge-text)]">Add a CSV to get started</p>
      <p className="mt-1 max-w-sm text-[13px] text-[var(--ge-text-secondary)]">
        This file has no columns. Replace it with a CSV that includes a header row.
      </p>
    </div>
  );
}
