"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error";
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
       * Mobile  : bottom of screen, safe-area-aware, full width with 16px inset
       * Desktop : top-right corner, compact 22rem width
       */}
      <div
        className={cn(
          "pointer-events-none fixed z-[200] flex flex-col gap-2",
          /* Mobile: bottom + safe area */
          "bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4",
          /* Desktop: top-right */
          "md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-[min(100vw-2rem,22rem)]"
        )}
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "toast-enter pointer-events-auto flex items-start gap-3",
              /* Mobile: full-width, 16px radius, compact padding */
              "rounded-2xl border p-3 shadow-[0_8px_30px_rgba(0,0,0,0.14)] backdrop-blur-md",
              /* Desktop: slightly more padding */
              "md:rounded-lg md:p-3.5",
              "bg-white/97 dark:bg-slate-900/97",
              toast.variant === "success"
                ? "border-green-200/80 dark:border-green-900/80"
                : "border-red-200/80 dark:border-red-900/80"
            )}
          >
            {/* Icon — 18px, vertically centered with title */}
            {toast.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-600" />
            )}

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug text-[var(--ge-text)] dark:text-slate-50">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ge-text-muted)] dark:text-slate-400">
                  {toast.description}
                </p>
              )}
            </div>

            {/* Dismiss — 44×44 touch target */}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--ge-text-muted)] transition-colors hover:bg-[var(--ge-surface)] hover:text-[var(--ge-text)] dark:hover:bg-slate-800 md:h-7 md:w-7 md:rounded-md"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
