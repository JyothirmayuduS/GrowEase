"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const MIN_WIDTH = 72;
const MAX_WIDTH = 1200;

function clamp(n: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)));
}

/**
 * Persistable column widths for hand-rolled tables.
 * Drag handles call `resize(key, nextWidth)`.
 */
export function useColumnWidths(
  keys: string[],
  defaults: Record<string, number>,
  storageKey?: string
) {
  const keySig = keys.join("\0");

  const initial = useMemo(() => {
    const base: Record<string, number> = {};
    for (const key of keys) {
      base[key] = defaults[key] ?? 140;
    }
    if (typeof window === "undefined" || !storageKey) return base;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return base;
      const parsed = JSON.parse(raw) as Record<string, number>;
      for (const key of keys) {
        if (typeof parsed[key] === "number") base[key] = clamp(parsed[key]);
      }
    } catch {
      /* ignore */
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when column set changes
  }, [keySig, storageKey]);

  const [widths, setWidths] = useState<Record<string, number>>(initial);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setWidths(initial);
  }, [initial]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [widths, storageKey]);

  const resize = useCallback((key: string, next: number) => {
    setWidths((prev) => ({ ...prev, [key]: clamp(next) }));
    setIsExpanded(false);
  }, []);

  const reset = useCallback(() => {
    const base: Record<string, number> = {};
    for (const key of keySig.split("\0").filter(Boolean)) {
      base[key] = defaults[key] ?? 140;
    }
    setWidths(base);
    setIsExpanded(false);
  }, [keySig, defaults]);

  const expand = useCallback(() => {
    const base: Record<string, number> = {};
    for (const key of keySig.split("\0").filter(Boolean)) {
      const defaultValue = defaults[key] ?? 140;
      base[key] = Math.round(defaultValue * 1.5);
    }
    setWidths(base);
    setIsExpanded(true);
  }, [keySig, defaults]);

  /** Cumulative left offset for sticky columns in `order` (excluding the last). */
  const stickyLeft = useCallback(
    (order: string[], index: number) => {
      let left = 0;
      for (let i = 0; i < index; i += 1) left += widths[order[i]] ?? 0;
      return left;
    },
    [widths]
  );

  return { widths, resize, reset, expand, isExpanded, stickyLeft };
}
