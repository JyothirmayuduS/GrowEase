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
      window.setTimeout(() => dismiss(id), 4800);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "toast-enter pointer-events-auto flex items-start gap-3 rounded-lg border bg-white/95 p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:bg-slate-900/95",
              toast.variant === "success"
                ? "border-green-200/80 dark:border-green-900/80"
                : "border-red-200/80 dark:border-red-900/80"
            )}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-600" />
            )}
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
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 text-[var(--ge-text-muted)] transition-colors hover:bg-[var(--ge-surface)] dark:hover:bg-slate-800"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
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
