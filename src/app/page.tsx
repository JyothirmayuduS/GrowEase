"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";

import { ImportLoader } from "@/components/features/csv-import/ImportLoader";
import { Header } from "@/components/layout/Header";
import { CsvPreviewSection } from "@/components/sections/CsvPreviewSection";
import { CsvUploadSection } from "@/components/sections/CsvUploadSection";
import type { AppView, ParsedCsv } from "@/lib/types/app";

const MIN_LOADER_MS = 2500;

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

export default function Home() {
  const [view, setView] = useState<AppView>("upload");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loaderMessage, setLoaderMessage] = useState("Give us a moment please");
  const parseStartedAt = useRef<number>(0);

  const handleFileSelect = useCallback((file: File) => {
    if (!(file instanceof File)) return;

    if (!isCsvFile(file)) {
      alert("Please upload a valid CSV file.");
      return;
    }

    setPendingFile(file);
    setLoaderMessage(`Parsing ${file.name}`);
    parseStartedAt.current = Date.now();

    queueMicrotask(() => setView("processing"));
  }, []);

  useEffect(() => {
    if (view !== "processing" || !pendingFile) return;

    let cancelled = false;

    Papa.parse<Record<string, string>>(pendingFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (cancelled) return;

        const finish = () => {
          if (cancelled) return;

          if (results.errors.length > 0) {
            console.warn("CSV parse warnings:", results.errors);
          }

          setParsedCsv({
            fileName: pendingFile.name,
            fileSize: pendingFile.size,
            headers: results.meta.fields ?? [],
            rows: results.data,
          });
          setPendingFile(null);
          setView("preview");
        };

        const elapsed = Date.now() - parseStartedAt.current;
        const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
        setTimeout(finish, remaining);
      },
      error: () => {
        if (cancelled) return;
        alert("Failed to parse CSV. Please check the file and try again.");
        setPendingFile(null);
        setView("upload");
      },
    });

    return () => {
      cancelled = true;
    };
  }, [view, pendingFile]);

  const handleConfirmImport = () => {
    setLoaderMessage("Extracting CRM fields from your data");
    setView("importing");
    setTimeout(() => setView("results"), MIN_LOADER_MS);
  };

  const handleReset = () => {
    setParsedCsv(null);
    setPendingFile(null);
    setLoaderMessage("Give us a moment please");
    setView("upload");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {view !== "processing" && view !== "importing" && <Header />}

      <main className="flex flex-1 flex-col overflow-hidden">
        {view === "upload" && <CsvUploadSection onFileSelect={handleFileSelect} />}

        {view === "processing" && (
          <ImportLoader title="Reading your CSV..." subtitle={loaderMessage} />
        )}

        {view === "preview" && parsedCsv && (
          <CsvPreviewSection
            data={parsedCsv}
            onConfirm={handleConfirmImport}
            onBack={handleReset}
          />
        )}

        {view === "importing" && (
          <ImportLoader title="Mapping leads with AI..." subtitle={loaderMessage} />
        )}

        {view === "results" && parsedCsv && (
          <section className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F4FF]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="#1473E6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#2C2C2C]">Import complete</h2>
              <p className="mt-2 text-sm text-[#6E6E6E]">
                {parsedCsv.rows.length} records processed from {parsedCsv.fileName}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-6 rounded-full bg-[#1473E6] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#0D66D0]"
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
