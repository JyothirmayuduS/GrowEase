"use client";

import { useEffect } from "react";

/**
 * After route/HMR churn, the browser can request obsolete webpack chunks.
 * Auto-reload once so sidebar navigation recovers without a manual hard refresh.
 */
export function ChunkErrorReload() {
  useEffect(() => {
    const key = "ge-chunk-reload";

    const shouldReload = (msg: string) =>
      /ChunkLoadError|Loading chunk [\w/-]+ failed|Failed to fetch dynamically imported module/i.test(
        msg
      );

    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const msg = event.message || String(event.error ?? "");
      if (shouldReload(msg)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error
          ? `${reason.name} ${reason.message}`
          : String(reason ?? "");
      if (shouldReload(msg)) reloadOnce();
    };

    // Clear the one-shot flag after a healthy load
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
