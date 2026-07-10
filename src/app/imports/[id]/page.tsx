"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { CrmResultsSection } from "@/components/sections/CrmResultsSection";
import { getImportById, type ImportHistoryEntry } from "@/lib/store/import-history";

function hasResultPayload(entry: ImportHistoryEntry): boolean {
  const r = entry.result;
  if (!r) return false;
  return r.imported.length > 0 || r.skipped.length > 0 || entry.totals.total > 0;
}

export default function ImportHistoryResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [entry, setEntry] = useState<ImportHistoryEntry | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setEntry(null);
      return;
    }
    setEntry(getImportById(id));
  }, [id]);

  if (entry === undefined) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center text-[13px] text-[var(--ge-text-muted)]">
          Loading import…
        </div>
      </AppShell>
    );
  }

  if (!entry || !hasResultPayload(entry)) {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[16px] font-semibold text-[var(--ge-text)]">
            {entry ? "Results unavailable for this import" : "Import not found"}
          </p>
          <p className="max-w-md text-[13px] text-[var(--ge-text-secondary)]">
            {entry
              ? "This history entry was saved before full results were stored. Run a new CSV import — new runs open from history with the full results table."
              : "That import id is missing from this browser’s workspace."}
          </p>
          <div className="flex gap-2">
            <Link href="/dashboard" className="ge-btn-secondary px-4 py-2 text-[13px]">
              Back to Dashboard
            </Link>
            <Link href="/lead-sources" className="ge-btn-primary px-4 py-2 text-[13px]">
              Import CSV
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CrmResultsSection
        fileName={entry.fileName}
        result={entry.result}
        onBack={() => router.push("/dashboard")}
        backLabel="Back to Dashboard"
      />
    </AppShell>
  );
}
