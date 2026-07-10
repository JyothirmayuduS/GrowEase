"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Global system crash caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 text-white font-sans">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01] p-8 backdrop-blur-xl">
          {/* Glowing accent background */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h2 className="mt-6 text-2xl font-bold tracking-tight">System Crash</h2>
            <p className="mt-2 text-sm text-white/60">
              A critical application error occurred. We have logged the diagnostic details.
            </p>

            <button
              onClick={reset}
              className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Application
            </button>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/60"
            >
              {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Crash details
            </button>

            {showDetails && (
              <div className="mt-4 rounded-lg bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-red-400 overflow-x-auto border border-white/5 max-h-48 ge-scroll-quiet">
                <p className="font-semibold text-red-300">Error: {error.message || "Unknown critical error"}</p>
                {error.digest && <p className="mt-1 text-white/30">Digest: {error.digest}</p>}
                {error.stack && (
                  <pre className="mt-2 text-white/20 whitespace-pre-wrap">{error.stack}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
