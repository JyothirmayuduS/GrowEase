"use client";

import { useCallback, useRef, useState } from "react";

import { streamImport } from "@/lib/api/stream-import";
import { parseCsvFile } from "@/lib/csv/parse-csv";
import { AiProcessingSection } from "@/components/sections/AiProcessingSection";
import { Header } from "@/components/layout/Header";
import { CrmResultsSection } from "@/components/sections/CrmResultsSection";
import { CsvPreviewSection } from "@/components/sections/CsvPreviewSection";
import { CsvUploadSection } from "@/components/sections/CsvUploadSection";
import type { ImportApiResponse } from "@/lib/types/crm";
import type { AppView, ParsedCsv } from "@/lib/types/app";

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

export function HomeClient() {
  const [view, setView] = useState<AppView>("upload");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [importResult, setImportResult] = useState<ImportApiResponse | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderStatus, setLoaderStatus] = useState("Reading CSV");
  const [loaderFileName, setLoaderFileName] = useState("");

  const importRunId = useRef(0);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file instanceof Event || !(file instanceof File)) return;

    if (!isCsvFile(file)) {
      alert("Please upload a valid CSV file.");
      return;
    }

    setIsParsing(true);
    setImportError(null);

    try {
      const parsed = await parseCsvFile(file);
      if (parsed.rows.length === 0 && parsed.headers.length === 0) {
        alert("The CSV file appears to be empty.");
        return;
      }
      setParsedCsv(parsed);
      setView("preview");
    } catch {
      alert("Failed to parse CSV. Please check the file and try again.");
      setView("upload");
    } finally {
      setIsParsing(false);
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
    setView("importing");

    try {
      const result = await streamImport(
        {
          fileName: parsedCsv.fileName,
          headers: parsedCsv.headers,
          rows: parsedCsv.rows,
        },
        (percent, status) => {
          if (runId !== importRunId.current) return;
          setLoaderProgress(percent);
          setLoaderStatus(status);
        }
      );

      if (runId !== importRunId.current) return;
      setImportResult(result);
      setView("results");
    } catch (error) {
      if (runId !== importRunId.current) return;
      const message = error instanceof Error ? error.message : "Import failed";
      setImportError(message);
      setView("preview");
    }
  }, [parsedCsv]);

  const handleConfirmImport = () => {
    void runImport();
  };

  const handleReset = () => {
    importRunId.current += 1;
    setParsedCsv(null);
    setImportResult(null);
    setImportError(null);
    setLoaderProgress(0);
    setLoaderStatus("Reading CSV");
    setLoaderFileName("");
    setView("upload");
  };

  const isImporting = view === "importing";

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      {!isImporting && <Header />}

      <main className="flex min-h-0 flex-1 flex-col">
        <div className={view === "upload" ? "flex flex-1 flex-col" : "hidden"}>
          <CsvUploadSection onFileSelect={handleFileSelect} />
        </div>

        {isImporting && (
          <AiProcessingSection
            progress={loaderProgress}
            status={loaderStatus}
            fileName={loaderFileName}
          />
        )}

        {view === "preview" && parsedCsv && (
          <>
            {importError && (
              <div className="mx-auto mt-4 w-full max-w-6xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
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
              isParsing={isParsing}
            />
          </>
        )}

        {view === "results" && parsedCsv && importResult && (
          <CrmResultsSection
            fileName={parsedCsv.fileName}
            result={importResult}
            onBack={handleReset}
          />
        )}
      </main>
    </div>
  );
}
