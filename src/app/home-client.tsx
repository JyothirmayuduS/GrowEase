"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { animateBootProgress } from "@/lib/animate-boot-progress";
import { animateParseProgress } from "@/lib/animate-parse-progress";
import { streamImport } from "@/lib/api/stream-import";
import { parseCsvFile } from "@/lib/csv/parse-csv";
import { AppShell } from "@/components/layout/AppShell";
import { AiProcessingSection } from "@/components/sections/AiProcessingSection";
import { CrmResultsSection } from "@/components/sections/CrmResultsSection";
import { CsvPreviewSection } from "@/components/sections/CsvPreviewSection";
import { CsvUploadSection } from "@/components/sections/CsvUploadSection";
import type { ImportApiResponse } from "@/lib/types/crm";
import type { AppView, ParsedCsv } from "@/lib/types/app";

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function HomeClient() {
  const [view, setView] = useState<AppView>("boot");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [importResult, setImportResult] = useState<ImportApiResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderStatus, setLoaderStatus] = useState("Initializing GrowEasy");
  const [loaderFileName, setLoaderFileName] = useState("");
  const [loaderSessionKey, setLoaderSessionKey] = useState("boot");

  const importRunId = useRef(0);
  const parseRunId = useRef(0);
  const bootRunId = useRef(0);

  useEffect(() => {
    const runId = bootRunId.current + 1;
    bootRunId.current = runId;

    void (async () => {
      setLoaderProgress(0);
      setLoaderStatus("Initializing GrowEasy");
      setLoaderSessionKey("boot");
      setView("boot");

      await animateBootProgress((percent, status) => {
        if (runId !== bootRunId.current) return;
        setLoaderProgress(percent);
        setLoaderStatus(status);
      });

      if (runId !== bootRunId.current) return;
      await wait(400);
      setView("upload");
    })();
  }, []);

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
        setView("upload");
        return;
      }

      setLoaderProgress(100);
      setLoaderStatus("Preparing Preview");
      await wait(600);

      if (runId !== parseRunId.current) return;
      setParsedCsv(parsed);
      setView("preview");
    } catch {
      if (runId !== parseRunId.current) return;
      alert("Failed to parse CSV. Please check the file and try again.");
      setView("upload");
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
    setLoaderSessionKey("upload");
    setView("upload");
  };

  const isLoading = view === "boot" || view === "importing";

  return (
    <AppShell>
      {isLoading ? (
        <AiProcessingSection
          progress={loaderProgress}
          status={loaderStatus}
          fileName={loaderFileName || undefined}
          sessionKey={loaderSessionKey}
          variant={
            loaderSessionKey === "boot" || loaderSessionKey.startsWith("parse") ? "parse" : "import"
          }
        />
      ) : (
        <>
          {view === "upload" && <CsvUploadSection onFileSelect={handleFileSelect} />}

          {view === "preview" && parsedCsv && (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              {importError && (
                <div className="shrink-0 border-b border-red-200 bg-red-50 px-8 py-3 text-sm text-red-700">
                  <strong>Import failed:</strong> {importError}
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="ml-3 font-semibold underline"
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
        </>
      )}
    </AppShell>
  );
}
