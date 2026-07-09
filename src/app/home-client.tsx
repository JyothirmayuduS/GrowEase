"use client";

import { useCallback, useRef, useState } from "react";

import { animateParseProgress } from "@/lib/animate-parse-progress";
import { streamImport } from "@/lib/api/stream-import";
import { parseCsvFile } from "@/lib/csv/parse-csv";
import { AppShell } from "@/components/layout/AppShell";
import { AiProcessingSection } from "@/components/sections/AiProcessingSection";
import { CrmResultsSection } from "@/components/sections/CrmResultsSection";
import { CsvPreviewSection } from "@/components/sections/CsvPreviewSection";
import { LandingUploadSection } from "@/components/sections/LandingUploadSection";
import type { ImportApiResponse } from "@/lib/types/crm";
import type { AppView, ParsedCsv } from "@/lib/types/app";

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function HomeClient() {
  const [view, setView] = useState<AppView>("landing");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [importResult, setImportResult] = useState<ImportApiResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderStatus, setLoaderStatus] = useState("Reading CSV");
  const [loaderFileName, setLoaderFileName] = useState("");
  const [loaderSessionKey, setLoaderSessionKey] = useState("parse");

  const importRunId = useRef(0);
  const parseRunId = useRef(0);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file instanceof Event || !(file instanceof File)) return;

    if (!isCsvFile(file)) {
      alert("Please upload a valid CSV file.");
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
        parseCsvFile(file),
        animateParseProgress((percent, status) => {
          if (runId !== parseRunId.current) return;
          setLoaderProgress(percent);
          setLoaderStatus(status);
        }),
      ]);

      if (runId !== parseRunId.current) return;

      if (parsed.rows.length === 0 && parsed.headers.length === 0) {
        alert("The CSV file appears to be empty.");
        setView("landing");
        return;
      }

      setLoaderProgress(100);
      setLoaderStatus("Opening GrowEasy");
      await wait(600);

      if (runId !== parseRunId.current) return;
      setParsedCsv(parsed);
      setView("preview");
    } catch {
      if (runId !== parseRunId.current) return;
      alert("Failed to parse CSV. Please check the file and try again.");
      setView("landing");
    }
  }, []);

  const runImport = useCallback(async () => {
    if (!parsedCsv) return;

    const runId = importRunId.current + 1;
    importRunId.current = runId;
    setImportError(null);
    setLoaderProgress(0);
    setLoaderStatus("Reading CSV");
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
          setLoaderStatus(status);
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
      await wait(800);
      setView("results");
    } catch (error) {
      if (runId !== importRunId.current) return;
      const message = error instanceof Error ? error.message : "Import failed";
      setImportError(message);
      setView("preview");
    } finally {
      window.clearInterval(smoothTimer);
    }
  }, [parsedCsv]);

  const handleConfirmImport = () => {
    void runImport();
  };

  const handleReset = () => {
    importRunId.current += 1;
    parseRunId.current += 1;
    setParsedCsv(null);
    setImportResult(null);
    setImportError(null);
    setLoaderProgress(0);
    setLoaderStatus("Reading CSV");
    setLoaderFileName("");
    setLoaderSessionKey("parse");
    setView("landing");
  };

  if (view === "landing") {
    return <LandingUploadSection onFileSelect={handleFileSelect} />;
  }

  if (view === "importing") {
    return (
      <div className="h-screen overflow-hidden bg-white dark:bg-slate-950">
        <AiProcessingSection
          progress={loaderProgress}
          status={loaderStatus}
          fileName={loaderFileName || undefined}
          sessionKey={loaderSessionKey}
          variant={loaderSessionKey.startsWith("parse") ? "parse" : "import"}
        />
      </div>
    );
  }

  return (
    <AppShell>
      {view === "preview" && parsedCsv && (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {importError && (
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800">
              <p>
                <strong>Import failed:</strong> {importError}
              </p>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="shrink-0 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Retry
              </button>
            </div>
          )}
          <CsvPreviewSection
            data={parsedCsv}
            onConfirm={handleConfirmImport}
            onBack={handleReset}
            onReplaceFile={handleFileSelect}
          />
        </div>
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
