"use client";

import { ImportProgressLoader } from "@/components/features/csv-import/ImportProgressLoader";

interface ImportProcessingSectionProps {
  progress: number;
  status: string;
  fileName?: string;
}

export function ImportProcessingSection({
  progress,
  status,
  fileName,
}: ImportProcessingSectionProps) {
  return <ImportProgressLoader progress={progress} status={status} fileName={fileName} />;
}
