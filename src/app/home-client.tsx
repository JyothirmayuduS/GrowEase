"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { animateParseProgress } from "@/lib/animate-parse-progress";
import { streamImport } from "@/lib/api/stream-import";
import { parseCsvViaApi, validateCsvFileClient } from "@/lib/csv/client-upload";
import { AppShell } from "@/components/layout/AppShell";
import { AiProcessingSection } from "@/components/sections/AiProcessingSection";
import { ImportProcessingSection } from "@/components/sections/ImportProcessingSection";
import { CrmResultsSection } from "@/components/sections/CrmResultsSection";
import { CsvPreviewSection } from "@/components/sections/CsvPreviewSection";
import { LandingUploadSection } from "@/components/sections/LandingUploadSection";
import { useToast } from "@/components/ui/toast";
import { pushImportHistory, upsertImportedLeads } from "@/lib/store/import-history";
import type { ImportApiResponse } from "@/lib/types/crm";
import type { AppView, ParsedCsv } from "@/lib/types/app";
import { assessRecordQuality } from "@/lib/validation/record-quality";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function HomeClient() {
  const { showToast } = useToast();
  const [view, setView] = useState<AppView>("landing");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [importResult, setImportResult] = useState<ImportApiResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderStatus, setLoaderStatus] = useState("Reading CSV");
  const [loaderFileName, setLoaderFileName] = useState("");
  const [loaderSessionKey, setLoaderSessionKey] = useState("parse");
  const [importBusy, setImportBusy] = useState(false);

  const importRunId = useRef(0);
  const parseRunId = useRef(0);
  const importInFlight = useRef(false);

  // Warm serverless functions on cold open so the first upload is snappier.
  useEffect(() => {
    void fetch("/api/health", { cache: "no-store" }).catch(() => undefined);
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file instanceof Event || !(file instanceof File)) return;

      const clientError = validateCsvFileClient(file);
      if (clientError) {
        showToast({
          variant: "error",
          title: "Invalid file",
          description: clientError,
        });
        return;
      }

      const runId = parseRunId.current + 1;
      parseRunId.current = runId;
      importRunId.current += 1;
      const sessionKey = `parse-${runId}`;

      setImportError(null);
      setImportResult(null);
      setLoaderFileName(file.name);
      setLoaderSessionKey(sessionKey);
      setLoaderProgress(0);
      setLoaderStatus("Reading CSV");
      setView("importing");

      try {
        const [parsed] = await Promise.all([
          parseCsvViaApi(file),
          animateParseProgress((percent, status) => {
            if (runId !== parseRunId.current) return;
            setLoaderProgress(percent);
            setLoaderStatus(status);
          }),
        ]);

        if (runId !== parseRunId.current) return;

        setLoaderProgress(100);
        setLoaderStatus("Opening GrowEasy");
        await wait(400);

        if (runId !== parseRunId.current) return;
        setParsedCsv({
          fileName: parsed.fileName,
          fileSize: parsed.fileSize,
          headers: parsed.headers,
          rows: parsed.rows,
        });
        showToast({
          variant: "success",
          title: "CSV ready for review",
          description: `${parsed.rowCount} rows and ${parsed.columnCount} columns parsed from ${parsed.fileName}. Confirm when ready to import.`,
        });
        setView("preview");
      } catch (error) {
        if (runId !== parseRunId.current) return;
        const message =
          error instanceof Error ? error.message : "Could not read this CSV. Check the file format and try again.";
        showToast({
          variant: "error",
          title: "Parse failed",
          description: message,
        });
        setView("landing");
      }
    },
    [showToast]
  );

  const runImport = useCallback(async () => {
    if (!parsedCsv || importInFlight.current) return;

    importInFlight.current = true;
    setImportBusy(true);

    const runId = importRunId.current + 1;
    importRunId.current = runId;
    setImportError(null);
    setLoaderProgress(0);
    setLoaderStatus("Mapping rows with AI…");
    setLoaderFileName(parsedCsv.fileName);
    setLoaderSessionKey(`import-${runId}`);
    setView("importing");

    let targetProgress = 0;
    let displayedProgress = 0;

    const smoothTimer = window.setInterval(() => {
      if (runId !== importRunId.current) return;
      if (displayedProgress < targetProgress) {
        displayedProgress = Math.min(displayedProgress + 0.6, targetProgress);
      } else if (displayedProgress < 94 && targetProgress < 94) {
        displayedProgress = Math.min(displayedProgress + 0.12, 94);
      }
      setLoaderProgress(displayedProgress);
    }, 150);

    try {
      const result = await streamImport(
        {
          fileName: parsedCsv.fileName,
          headers: parsedCsv.headers,
          rows: parsedCsv.rows,
        },
        (percent, status) => {
          if (runId !== importRunId.current) return;
          targetProgress = percent;
          setLoaderStatus(status || `Mapping ${parsedCsv.rows.length} rows with AI…`);
        }
      );

      if (runId !== importRunId.current) return;

      while (displayedProgress < 100) {
        displayedProgress = Math.min(displayedProgress + 1.2, 100);
        setLoaderProgress(displayedProgress);
        await wait(80);
      }

      setLoaderStatus("Completed");
      setImportResult(result);

      // Persist for Dashboard / Manage Leads (browser workspace).
      const enriched = result.imported.map((record) => {
        const quality = assessRecordQuality(record);
        return {
          record,
          qualityState: (quality.flagged ? "needs_review" : "clean") as
            | "clean"
            | "needs_review",
          confidence: quality.confidence,
        };
      });
      upsertImportedLeads(enriched, parsedCsv.fileName);
      pushImportHistory({
        fileName: parsedCsv.fileName,
        importedAt: new Date().toISOString(),
        totals: result.totals,
        quality: {
          total: result.totals.total,
          clean: enriched.filter((e) => e.qualityState === "clean").length,
          needsReview: enriched.filter((e) => e.qualityState === "needs_review").length,
          skipped: result.totals.skipped,
        },
        avgConfidence:
          enriched.length === 0
            ? 0
            : Math.round(
                enriched.reduce((s, e) => s + e.confidence, 0) / enriched.length
              ),
      });

      showToast({
        variant: "success",
        title: "Import complete",
        description: `${result.totals.imported} of ${result.totals.total} leads mapped into GrowEasy CRM.${
          result.totals.skipped > 0 ? ` ${result.totals.skipped} rows were skipped.` : ""
        }`,
      });
      await wait(800);
      setView("results");
    } catch (error) {
      if (runId !== importRunId.current) return;
      const message = error instanceof Error ? error.message : "Import failed";
      setImportError(message);
      showToast({
        variant: "error",
        title: "Import failed",
        description: message,
      });
      setView("preview");
    } finally {
      window.clearInterval(smoothTimer);
      importInFlight.current = false;
      setImportBusy(false);
    }
  }, [parsedCsv, showToast]);

  const handleConfirmImport = () => {
    if (importInFlight.current || !parsedCsv) return;
    showToast({
      variant: "success",
      title: "Starting AI import",
      description: `Mapping ${parsedCsv.rows.length} rows with AI…`,
    });
    void runImport();
  };

  const handleReset = () => {
    importRunId.current += 1;
    parseRunId.current += 1;
    importInFlight.current = false;
    setImportBusy(false);
    setParsedCsv(null);
    setImportResult(null);
    setImportError(null);
    setLoaderProgress(0);
    setLoaderStatus("Reading CSV");
    setLoaderFileName("");
    setLoaderSessionKey("parse");
    setView("landing");
  };

  const isParseImporting = view === "importing" && loaderSessionKey.startsWith("parse");
  const isAiImporting = view === "importing" && loaderSessionKey.startsWith("import");

  if (view === "landing") {
    return <LandingUploadSection onFileSelect={handleFileSelect} />;
  }

  if (isParseImporting) {
    return (
      <div className="h-screen overflow-hidden bg-white dark:bg-slate-950">
        <AiProcessingSection
          progress={loaderProgress}
          status={loaderStatus}
          fileName={loaderFileName || undefined}
          sessionKey={loaderSessionKey}
          variant="parse"
        />
      </div>
    );
  }

  if (isAiImporting) {
    return (
      <AppShell>
        <ImportProcessingSection
          progress={loaderProgress}
          status={loaderStatus}
          fileName={loaderFileName || undefined}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {view === "preview" && parsedCsv && (
        <CsvPreviewSection
          data={parsedCsv}
          onConfirm={handleConfirmImport}
          onBack={handleReset}
          onReplaceFile={handleFileSelect}
          errorMessage={importError}
          onRetry={handleConfirmImport}
          confirmDisabled={importBusy}
        />
      )}

      {view === "results" && parsedCsv && importResult && (
        <CrmResultsSection
          fileName={parsedCsv.fileName}
          result={importResult}
          onBack={handleReset}
        />
      )}
    </AppShell>
  );
}
