"use client";

import { GoogleDriveIcon } from "@/components/icons/GoogleDriveIcon";
import { OneDriveIcon } from "@/components/icons/OneDriveIcon";

const STORAGE_PROVIDERS = [
  { id: "google-drive", label: "Google Drive", Icon: GoogleDriveIcon },
  { id: "onedrive", label: "OneDrive", Icon: OneDriveIcon },
] as const;

interface CloudStorageButtonsProps {
  variant?: "default" | "compact";
}

export function CloudStorageButtons({ variant = "default" }: CloudStorageButtonsProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center justify-center gap-4">
        {STORAGE_PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-label={`Import from ${label}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e8e8e8] bg-white shadow-sm transition-all hover:border-[#d0d0d0] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <Icon className="h-6 w-6" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {STORAGE_PROVIDERS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={`Import from ${label}`}
          className="group inline-flex min-h-11 min-w-[11rem] items-center gap-3 rounded-full border border-[var(--ge-border)] bg-white px-4 py-2.5 text-left shadow-sm transition-all hover:border-[#c8c8c8] hover:bg-[var(--ge-surface)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ge-surface)] transition-colors group-hover:bg-white">
            <Icon className="h-[22px] w-[22px]" />
          </span>
          <span className="text-[13px] font-medium text-[var(--ge-text)]">{label}</span>
        </button>
      ))}
    </div>
  );
}
