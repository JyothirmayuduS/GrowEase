"use client";

import { CubeProgressLoader } from "@/components/features/csv-import/CubeProgressLoader";
import type { LoaderStatus } from "@/lib/import-progress";

interface AiProcessingSectionProps {
  progress: number;
  status: LoaderStatus | string;
  fileName?: string;
  sessionKey?: string;
  variant?: "parse" | "import";
}

export function AiProcessingSection({
  progress,
  status,
  fileName,
  sessionKey,
  variant = "import",
}: AiProcessingSectionProps) {
  return (
    <CubeProgressLoader
      progress={progress}
      status={status}
      subtitle={fileName ? `Processing ${fileName}` : undefined}
      resetKey={sessionKey ?? fileName ?? "import"}
      variant={variant}
    />
  );
}
