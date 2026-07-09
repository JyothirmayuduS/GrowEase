"use client";

import {
  clampProgress,
  getBoxPhase,
  getStatusForProgress,
  isLoaderComplete,
  type LoaderStatus,
} from "@/lib/import-progress";
import { cn } from "@/lib/utils";

import "./cube-progress-loader.css";

const BOX_COUNT = 8;

export interface CubeProgressLoaderProps {
  progress: number;
  status?: LoaderStatus | string;
  subtitle?: string;
  className?: string;
}

export function CubeProgressLoader({
  progress,
  status,
  subtitle,
  className,
}: CubeProgressLoaderProps) {
  const clamped = clampProgress(progress);
  const complete = isLoaderComplete(clamped);
  const statusLabel = status ?? getStatusForProgress(clamped);
  const hasStack = clamped > 0;

  return (
    <section
      className={cn(
        "cube-progress-loader flex flex-1 flex-col items-center justify-center bg-white px-6 py-8",
        hasStack && "has-stack",
        complete && "complete",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
    >
      <div className="cube-progress-loader__stage-wrap">
        <div className="loader" aria-hidden="true">
          {Array.from({ length: BOX_COUNT }, (_, index) => {
            const phase = getBoxPhase(clamped, index);
            if (phase === "hidden") return null;

            return (
              <div key={index} className={cn("box", `box${index}`, phase)}>
                <div />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 w-full max-w-[340px]">
        <div
          className="cube-progress-loader__progress-track"
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${statusLabel} progress`}
        >
          <div
            className="cube-progress-loader__progress-fill"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs font-medium tabular-nums text-[#6E6E6E]">
          {Math.round(clamped)}%
        </p>
      </div>

      <h2 className="mt-5 text-center text-2xl font-bold text-[#2C2C2C]">{statusLabel}</h2>

      {subtitle && (
        <p className="mt-2 max-w-sm text-center text-sm text-[#6E6E6E]">{subtitle}</p>
      )}
    </section>
  );
}
