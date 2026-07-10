"use client";

const STORAGE_KEY = "ge-ad-accounts-v1";

export type AdPlatform = "facebook" | "google";

export interface AdAccountConnection {
  id: string;
  platform: AdPlatform;
  accountName: string;
  status: "connected" | "disconnected";
  lastSync: string | null;
  forms: number;
  leads7d: number;
}

const DEFAULT_ACCOUNTS: AdAccountConnection[] = [
  {
    id: "fb-main",
    platform: "facebook",
    accountName: "GrowEasy RE — Main",
    status: "connected",
    lastSync: "2 hours ago",
    forms: 3,
    leads7d: 64,
  },
  {
    id: "gads-main",
    platform: "google",
    accountName: "Not connected",
    status: "disconnected",
    lastSync: null,
    forms: 0,
    leads7d: 0,
  },
];

function read(): AdAccountConnection[] {
  if (typeof window === "undefined") return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACCOUNTS;
    const parsed = JSON.parse(raw) as AdAccountConnection[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ACCOUNTS;
    return parsed;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function write(accounts: AdAccountConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function getAdAccounts(): AdAccountConnection[] {
  return read();
}

export function connectAdAccount(platform: AdPlatform): AdAccountConnection[] {
  const accounts = read();
  const next = accounts.map((a) => {
    if (a.platform !== platform) return a;
    return {
      ...a,
      status: "connected" as const,
      accountName:
        platform === "facebook"
          ? "GrowEasy RE — Main"
          : "GrowEasy Google Ads — IN",
      lastSync: "Just now",
      forms: platform === "facebook" ? 3 : 2,
      leads7d: platform === "facebook" ? 64 : 28,
    };
  });

  // If platform somehow missing, append
  if (!next.some((a) => a.platform === platform)) {
    next.push({
      id: `${platform}-${Date.now()}`,
      platform,
      accountName:
        platform === "facebook"
          ? "GrowEasy RE — Main"
          : "GrowEasy Google Ads — IN",
      status: "connected",
      lastSync: "Just now",
      forms: platform === "facebook" ? 3 : 2,
      leads7d: platform === "facebook" ? 64 : 28,
    });
  }

  write(next);
  return next;
}

export function syncAdAccount(id: string): AdAccountConnection[] {
  const accounts = read().map((a) =>
    a.id === id && a.status === "connected"
      ? { ...a, lastSync: "Just now", leads7d: a.leads7d + Math.floor(Math.random() * 5) + 1 }
      : a
  );
  write(accounts);
  return accounts;
}

export function disconnectAdAccount(id: string): AdAccountConnection[] {
  const accounts = read().map((a) =>
    a.id === id
      ? {
          ...a,
          status: "disconnected" as const,
          accountName: "Not connected",
          lastSync: null,
          forms: 0,
          leads7d: 0,
        }
      : a
  );
  write(accounts);
  return accounts;
}
