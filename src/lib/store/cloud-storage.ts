"use client";

const STORAGE_KEY = "ge-cloud-storage-v1";

export type CloudProvider = "google-drive" | "onedrive";

export interface CloudConnection {
  provider: CloudProvider;
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

const DEFAULTS: CloudConnection[] = [
  { provider: "google-drive", connected: false, email: null, connectedAt: null },
  { provider: "onedrive", connected: false, email: null, connectedAt: null },
];

function read(): CloudConnection[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as CloudConnection[];
    if (!Array.isArray(parsed)) return DEFAULTS;
    return DEFAULTS.map((d) => parsed.find((p) => p.provider === d.provider) ?? d);
  } catch {
    return DEFAULTS;
  }
}

function write(connections: CloudConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

export function getCloudConnections(): CloudConnection[] {
  return read();
}

export function getCloudConnection(provider: CloudProvider): CloudConnection {
  return read().find((c) => c.provider === provider) ?? DEFAULTS.find((d) => d.provider === provider)!;
}

export function connectCloudProvider(provider: CloudProvider): CloudConnection {
  const email =
    provider === "google-drive"
      ? "varun@groweasy.ai"
      : "varun@testcorp.onmicrosoft.com";
  const next = read().map((c) =>
    c.provider === provider
      ? {
          ...c,
          connected: true,
          email,
          connectedAt: new Date().toISOString(),
        }
      : c
  );
  write(next);
  return next.find((c) => c.provider === provider)!;
}

export function disconnectCloudProvider(provider: CloudProvider): CloudConnection {
  const next = read().map((c) =>
    c.provider === provider
      ? { ...c, connected: false, email: null, connectedAt: null }
      : c
  );
  write(next);
  return next.find((c) => c.provider === provider)!;
}

export interface CloudSampleFile {
  id: string;
  name: string;
  path: string;
  sizeLabel: string;
  modified: string;
  folder: string;
}

export const CLOUD_SAMPLE_FILES: CloudSampleFile[] = [
  {
    id: "fb",
    name: "facebook-leads.csv",
    path: "/samples/facebook-leads.csv",
    sizeLabel: "12 KB",
    modified: "Today",
    folder: "Lead Ads / Exports",
  },
  {
    id: "gads",
    name: "google-ads-export.csv",
    path: "/samples/google-ads-export.csv",
    sizeLabel: "9 KB",
    modified: "Yesterday",
    folder: "Marketing / Google Ads",
  },
  {
    id: "wa",
    name: "whatsapp-agent-sheet.csv",
    path: "/samples/whatsapp-agent-sheet.csv",
    sizeLabel: "8 KB",
    modified: "2 days ago",
    folder: "Sales / WhatsApp",
  },
  {
    id: "zoho",
    name: "zoho-crm-export.csv",
    path: "/samples/zoho-crm-export.csv",
    sizeLabel: "15 KB",
    modified: "3 days ago",
    folder: "CRM / Zoho",
  },
  {
    id: "messy",
    name: "real-estate-messy.csv",
    path: "/samples/real-estate-messy.csv",
    sizeLabel: "11 KB",
    modified: "Last week",
    folder: "Imports / Raw",
  },
];

export async function fetchCloudSampleAsFile(sample: CloudSampleFile): Promise<File> {
  const res = await fetch(sample.path);
  if (!res.ok) throw new Error(`Could not load ${sample.name}`);
  const blob = await res.blob();
  return new File([blob], sample.name, { type: "text/csv" });
}
