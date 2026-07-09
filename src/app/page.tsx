"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AiProcessingSection } from "@/components/sections/AiProcessingSection";
import { Header } from "@/components/layout/Header";
import { CsvPreviewSection } from "@/components/sections/CsvPreviewSection";
import { CsvUploadSection } from "@/components/sections/CsvUploadSection";
import type { LoaderStatus } from "@/lib/import-progress";
import { runImportPipeline, runProcessingPipeline } from "@/lib/run-processing-pipeline";
import type { AppView, ParsedCsv } from "@/lib/types/app";

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

export default function Home() {
  const [view, setView] = useState<AppView>("upload");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderStatus, setLoaderStatus] = useState<LoaderStatus | string>("Reading CSV");
  const [loaderFileName, setLoaderFileName] = useState<string>("");

  const pipelineRunId = useRef(0);

  const resetLoader = useCallback(() => {
    setLoaderProgress(0);
    setLoaderStatus("Reading CSV");
    setLoaderFileName("");
    pipelineRunId.current += 1;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file instanceof Event || !(file instanceof File)) return;

      if (!isCsvFile(file)) {
        alert("Please upload a valid CSV file.");
        return;
      }

      resetLoader();
      setPendingFile(file);
      setLoaderFileName(file.name);
      window.setTimeout(() => setView("processing"), 0);
    },
    [resetLoader]
  );

  useEffect(() => {
    if (view !== "processing" || !pendingFile) return;

    const runId = pipelineRunId.current + 1;
    pipelineRunId.current = runId;
    let cancelled = false;

    const onProgress = (progress: number, status: LoaderStatus) => {
      if (cancelled || runId !== pipelineRunId.current) return;
      setLoaderProgress(progress);
      setLoaderStatus(status);
    };

    runProcessingPipeline(pendingFile, onProgress)
      .then((parsed) => {
        if (cancelled || runId !== pipelineRunId.current) return;
        setParsedCsv(parsed);
        setPendingFile(null);
        resetLoader();
        setView("preview");
      })
      .catch(() => {
        if (cancelled || runId !== pipelineRunId.current) return;
        alert("Failed to parse CSV. Please check the file and try again.");
        setPendingFile(null);
        resetLoader();
        setView("upload");
      });

    return () => {
      cancelled = true;
    };
  }, [view, pendingFile, resetLoader]);

  useEffect(() => {
    if (view !== "importing" || !parsedCsv) return;

    const runId = pipelineRunId.current + 1;
    pipelineRunId.current = runId;
    let cancelled = false;

    const onProgress = (progress: number, status: LoaderStatus) => {
      if (cancelled || runId !== pipelineRunId.current) return;
      setLoaderProgress(progress);
      setLoaderStatus(status);
    };

    runImportPipeline(parsedCsv.rows.length, onProgress)
      .then(() => {
        if (cancelled || runId !== pipelineRunId.current) return;
        resetLoader();
        setView("results");
      })
      .catch(() => {
        if (cancelled || runId !== pipelineRunId.current) return;
        resetLoader();
        setView("preview");
      });

    return () => {
      cancelled = true;
    };
  }, [view, parsedCsv, resetLoader]);

  const handleConfirmImport = () => {
    if (!parsedCsv) return;
    resetLoader();
    setLoaderFileName(parsedCsv.fileName);
    setView("importing");
  };

  const handleReset = () => {
    setParsedCsv(null);
    setPendingFile(null);
    resetLoader();
    setView("upload");
  };

  const isProcessingView = view === "processing" || view === "importing";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {!isProcessingView && <Header />}

      <main className="flex min-h-0 flex-1 flex-col">
        <div className={view === "upload" ? "flex flex-1 flex-col" : "hidden"}>
          <CsvUploadSection onFileSelect={handleFileSelect} />
        </div>

        {isProcessingView && (
          <AiProcessingSection
            progress={loaderProgress}
            status={loaderStatus}
            fileName={loaderFileName}
          />
        )}

        {view === "preview" && parsedCsv && (
          <CsvPreviewSection
            data={parsedCsv}
            onConfirm={handleConfirmImport}
            onBack={handleReset}
          />
        )}

        {view === "results" && parsedCsv && (
          <section className="flex flex-1 flex-col items-center justify-center px-6 dark:bg-slate-950">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="#16A34A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Import complete</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {parsedCsv.rows.length} records processed from {parsedCsv.fileName}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-6 rounded-full bg-[#2563EB] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Import another file
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
