"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
const FLY_DURATION_MS = 1500;
const MIN_SPAWN_GAP_MS = 1400;

type BoxState = "hidden" | "flying" | "landed";

export interface CubeProgressLoaderProps {
  progress: number;
  status?: LoaderStatus | string;
  subtitle?: string;
  className?: string;
  resetKey?: string;
  variant?: "parse" | "import";
}

export function CubeProgressLoader({
  progress,
  status,
  subtitle,
  className,
  resetKey = "default",
  variant = "import",
}: CubeProgressLoaderProps) {
  const clamped = clampProgress(progress);
  const showComplete = variant === "import" && isLoaderComplete(clamped);
  const statusLabel = status ?? getStatusForProgress(clamped);
  const hasStack = clamped > 0;

  const [boxStates, setBoxStates] = useState<BoxState[]>(() =>
    Array.from({ length: BOX_COUNT }, () => "hidden")
  );

  const startedRef = useRef<Set<number>>(new Set());
  const queueRef = useRef<number[]>([]);
  const lastSpawnAtRef = useRef(0);
  const spawnTimerRef = useRef<number | null>(null);
  const landTimersRef = useRef<number[]>([]);

  const clearSpawnTimer = useCallback(() => {
    if (spawnTimerRef.current != null) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
  }, []);

  const spawnBox = useCallback((index: number) => {
    startedRef.current.add(index);
    lastSpawnAtRef.current = Date.now();

    setBoxStates((prev) => {
      const next = [...prev];
      next[index] = "flying";
      return next;
    });

    const landTimer = window.setTimeout(() => {
      setBoxStates((prev) => {
        if (prev[index] !== "flying") return prev;
        const next = [...prev];
        next[index] = "landed";
        return next;
      });
    }, FLY_DURATION_MS);

    landTimersRef.current.push(landTimer);
  }, []);

  const scheduleNextSpawn = useCallback(() => {
    clearSpawnTimer();

    if (queueRef.current.length === 0) return;

    const elapsed = Date.now() - lastSpawnAtRef.current;
    const delay = lastSpawnAtRef.current === 0 ? 0 : Math.max(0, MIN_SPAWN_GAP_MS - elapsed);

    spawnTimerRef.current = window.setTimeout(() => {
      const nextIndex = queueRef.current.shift();
      if (nextIndex == null) return;
      spawnBox(nextIndex);
      scheduleNextSpawn();
    }, delay);
  }, [clearSpawnTimer, spawnBox]);

  useEffect(() => {
    setBoxStates(Array.from({ length: BOX_COUNT }, () => "hidden"));
    startedRef.current = new Set();
    queueRef.current = [];
    lastSpawnAtRef.current = 0;
    clearSpawnTimer();
    landTimersRef.current.forEach((id) => window.clearTimeout(id));
    landTimersRef.current = [];
  }, [resetKey, clearSpawnTimer]);

  useEffect(() => {
    for (let index = 0; index < BOX_COUNT; index += 1) {
      const phase = getBoxPhase(clamped, index);
      if (phase === "hidden") continue;
      if (startedRef.current.has(index)) continue;
      if (queueRef.current.includes(index)) continue;
      queueRef.current.push(index);
    }

    if (spawnTimerRef.current == null && queueRef.current.length > 0) {
      scheduleNextSpawn();
    }
  }, [clamped, scheduleNextSpawn]);

  useEffect(() => {
    return () => {
      clearSpawnTimer();
      landTimersRef.current.forEach((id) => window.clearTimeout(id));
      landTimersRef.current = [];
    };
  }, [clearSpawnTimer]);

  return (
    <section
      className={cn(
        "cube-progress-loader flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center bg-[var(--ge-page-bg)] px-6 py-8 dark:bg-slate-950",
        hasStack && "has-stack",
        showComplete && "complete",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
    >
      <div className="cube-progress-loader__stage-wrap">
        <div className="loader" aria-hidden="true">
          {boxStates.map((state, index) => {
            if (state === "hidden") return null;

            return (
              <div
                key={`${resetKey}-box-${index}`}
                className={cn("box", `box${index}`, state)}
              >
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
        <p className="mt-2 text-center text-xs font-medium tabular-nums text-[#6E6E6E] dark:text-slate-400">
          {Math.round(clamped)}%
        </p>
      </div>

      <h2 className="mt-5 text-center text-2xl font-bold text-[#2C2C2C] dark:text-slate-100">
        {statusLabel}
      </h2>

      {subtitle && (
        <p className="mt-2 max-w-sm text-center text-sm text-[#6E6E6E] dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </section>
  );
}
