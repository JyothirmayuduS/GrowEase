"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw, Home, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Runtime error caught at boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h2 className="mt-6 text-2xl font-bold tracking-tight">Something went wrong</h2>
          <p className="mt-2 text-sm text-white/60">
            An unexpected error occurred while processing this page.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </div>
        </div>

        {/* Collapsible Error Inspector */}
        <div className="mt-8 border-t border-white/5 pt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/60"
          >
            {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Diagnostic details
          </button>

          {showDetails && (
            <div className="mt-4 rounded-lg bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-rose-400/90 overflow-x-auto border border-white/5 max-h-48 ge-scroll-quiet">
              <p className="font-semibold text-rose-300">Message: {error.message || "Unknown error"}</p>
              {error.digest && <p className="mt-1 text-white/40">Digest: {error.digest}</p>}
              {error.stack && (
                <pre className="mt-2 text-white/30 whitespace-pre-wrap">{error.stack}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
