"use client";

import { CubeProgressLoader } from "@/components/features/csv-import/CubeProgressLoader";
import type { LoaderStatus } from "@/lib/import-progress";

interface AiProcessingSectionProps {
  progress: number;
  status: LoaderStatus | string;
  fileName?: string;
}

export function AiProcessingSection({ progress, status, fileName }: AiProcessingSectionProps) {
  return (
    <CubeProgressLoader
      progress={progress}
      status={status}
      subtitle={fileName ? `Processing ${fileName}` : undefined}
    />
  );
}
