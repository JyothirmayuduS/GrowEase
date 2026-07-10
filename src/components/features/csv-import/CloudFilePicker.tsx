"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FileSpreadsheet, FolderOpen, Loader2, X } from "lucide-react";

import { GoogleDriveIcon } from "@/components/icons/GoogleDriveIcon";
import { OneDriveIcon } from "@/components/icons/OneDriveIcon";
import { useToast } from "@/components/ui/toast";
import type { CloudProvider } from "@/lib/store/cloud-storage";
import { cn } from "@/lib/utils";

interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

interface CloudFilePickerProps {
  provider: CloudProvider;
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

const PROVIDER_META: Record<
  CloudProvider,
  { label: string; Icon: typeof GoogleDriveIcon; oauthPath: string }
> = {
  "google-drive": {
    label: "Google Drive",
    Icon: GoogleDriveIcon,
    oauthPath: "/api/oauth/google-drive/start?returnTo=/lead-sources",
  },
  onedrive: {
    label: "OneDrive",
    Icon: OneDriveIcon,
    oauthPath: "/api/oauth/onedrive/start?returnTo=/lead-sources",
  },
};

function formatBytes(n?: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CloudFilePicker({
  provider,
  open,
  onClose,
  onFileSelect,
}: CloudFilePickerProps) {
  const { showToast } = useToast();
  const titleId = useId();
  const meta = PROVIDER_META[provider];
  const Icon = meta.Icon;

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await fetch("/api/integrations/status");
      const status = (await statusRes.json()) as {
        providers: Array<{
          provider: string;
          configured: boolean;
          connected: boolean;
          email?: string;
          missing: string[];
        }>;
      };
      const row = status.providers.find((p) => p.provider === provider);
      setConfigured(Boolean(row?.configured));
      setConnected(Boolean(row?.connected));
      setEmail(row?.email ?? null);

      if (!row?.configured) {
        setFiles([]);
        setLoading(false);
        return;
      }
      if (!row.connected) {
        setFiles([]);
        setLoading(false);
        return;
      }

      const filesRes = await fetch(
        `/api/integrations/cloud/files?provider=${encodeURIComponent(provider)}`
      );
      if (filesRes.status === 401) {
        setConnected(false);
        setFiles([]);
        setLoading(false);
        return;
      }
      if (!filesRes.ok) {
        const body = (await filesRes.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        setError(body.detail || body.error || "Could not list files");
        setLoading(false);
        return;
      }
      const body = (await filesRes.json()) as {
        email?: string;
        files: CloudFile[];
      };
      setEmail(body.email ?? row.email ?? null);
      setFiles(body.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDownload = useCallback(
    async (file: CloudFile) => {
      setDownloadingId(file.id);
      try {
        const url = `/api/integrations/cloud/download?provider=${encodeURIComponent(provider)}&fileId=${encodeURIComponent(file.id)}&mimeType=${encodeURIComponent(file.mimeType)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Download failed");
        }
        const blob = await res.blob();
        const headerName = res.headers.get("X-Filename");
        const name = headerName ? decodeURIComponent(headerName) : file.name;
        const picked = new File([blob], name, { type: "text/csv" });
        showToast({
          title: `Imported from ${meta.label}`,
          description: name,
          variant: "success",
        });
        onFileSelect(picked);
        onClose();
      } catch (err) {
        showToast({
          title: "Could not open file",
          description: err instanceof Error ? err.message : "Try again",
          variant: "error",
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [meta.label, onClose, onFileSelect, provider, showToast]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--ge-border)] bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[var(--ge-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ge-surface)]">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h2 id={titleId} className="text-[15px] font-semibold text-[var(--ge-text)]">
                {meta.label}
              </h2>
              <p className="text-[12px] text-[var(--ge-text-muted)]">
                {connected && email ? email : "Connect your real account"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--ge-text-muted)] hover:bg-[var(--ge-surface)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <div className="flex flex-col items-center py-10 text-[var(--ge-text-muted)]">
              <Loader2 className="mb-3 h-8 w-8 animate-spin" />
              <p className="text-[13px]">Checking connection…</p>
            </div>
          ) : !configured ? (
            <div className="flex flex-col items-center py-6 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-[var(--ge-text-muted)]" />
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">
                {meta.label} not configured
              </p>
              <p className="mt-1 max-w-sm text-[13px] text-[var(--ge-text-secondary)]">
                Add OAuth credentials in <code className="text-[12px]">.env.local</code>, then
                restart the server. Full steps are on the Integrations setup page.
              </p>
              <a
                href="/settings/integrations"
                className="ge-btn-primary mt-5 inline-flex px-5 py-2.5 text-[13px]"
              >
                Open setup guide
              </a>
            </div>
          ) : !connected ? (
            <div className="flex flex-col items-center py-6 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-[var(--ge-text-muted)]" />
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">
                Connect {meta.label}
              </p>
              <p className="mt-1 max-w-sm text-[13px] text-[var(--ge-text-secondary)]">
                Sign in with your real {meta.label} account. GrowEasy only requests read access to
                CSV / spreadsheet files.
              </p>
              <a
                href={meta.oauthPath}
                className="ge-btn-primary mt-5 inline-flex min-w-[12rem] items-center justify-center px-5 py-2.5 text-[13px]"
              >
                Continue with {meta.label === "Google Drive" ? "Google" : "Microsoft"}
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
                  Your CSV files
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
                >
                  Refresh
                </button>
              </div>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {error}
                </p>
              ) : null}
              {files.length === 0 && !error ? (
                <p className="py-8 text-center text-[13px] text-[var(--ge-text-secondary)]">
                  No CSV or Google Sheets found. Upload a <code>.csv</code> to {meta.label} and
                  refresh.
                </p>
              ) : (
                <ul className="max-h-[280px] space-y-1.5 overflow-y-auto">
                  {files.map((file) => (
                    <li key={file.id}>
                      <button
                        type="button"
                        disabled={downloadingId !== null}
                        onClick={() => void handleDownload(file)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2.5 text-left transition-colors hover:border-[var(--ge-border-strong)] hover:bg-[var(--ge-surface)]",
                          downloadingId === file.id && "border-[var(--ge-accent)]"
                        )}
                      >
                        <FileSpreadsheet className="h-5 w-5 shrink-0 text-[var(--ge-accent)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[var(--ge-text)]">
                            {file.name}
                          </span>
                          <span className="block truncate text-[11px] text-[var(--ge-text-muted)]">
                            {[formatBytes(file.size), file.modifiedTime?.slice(0, 10)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        {downloadingId === file.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--ge-accent)]" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <a
                href="/api/integrations/disconnect"
                onClick={async (e) => {
                  e.preventDefault();
                  await fetch("/api/integrations/disconnect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider }),
                  });
                  showToast({
                    title: `${meta.label} disconnected`,
                    variant: "success",
                  });
                  void load();
                }}
                className="block pt-1 text-center text-[12px] text-[var(--ge-text-muted)] hover:underline"
              >
                Disconnect {meta.label}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
