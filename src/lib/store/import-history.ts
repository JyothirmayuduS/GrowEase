import type { CrmLeadRecord, CrmStatus, DataSource } from "@/lib/types/crm";
import type { QualitySummary } from "@/lib/validation/row-quality";

const HISTORY_KEY = "ge-import-history-v1";
const LEADS_KEY = "ge-leads-store-v1";
const MAX_HISTORY = 20;
const MAX_LEADS = 500;

export interface ImportHistoryEntry {
  id: string;
  fileName: string;
  importedAt: string;
  totals: { imported: number; skipped: number; total: number };
  quality: QualitySummary;
  avgConfidence: number;
}

export interface StoredLead extends CrmLeadRecord {
  id: string;
  importedAt: string;
  sourceFile: string;
  qualityState: "clean" | "needs_review";
  confidence: number;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function getImportHistory(): ImportHistoryEntry[] {
  return readJson<ImportHistoryEntry[]>(HISTORY_KEY, []);
}

export function pushImportHistory(entry: Omit<ImportHistoryEntry, "id">): ImportHistoryEntry {
  const full: ImportHistoryEntry = { ...entry, id: crypto.randomUUID() };
  const next = [full, ...getImportHistory()].slice(0, MAX_HISTORY);
  writeJson(HISTORY_KEY, next);
  return full;
}

export function getStoredLeads(): StoredLead[] {
  return readJson<StoredLead[]>(LEADS_KEY, []);
}

export function upsertImportedLeads(
  records: Array<{
    record: CrmLeadRecord;
    qualityState: "clean" | "needs_review";
    confidence: number;
  }>,
  fileName: string
): StoredLead[] {
  const stamped = records.map(({ record, qualityState, confidence }) => ({
    ...record,
    id: crypto.randomUUID(),
    importedAt: new Date().toISOString(),
    sourceFile: fileName,
    qualityState,
    confidence,
  }));
  const next = [...stamped, ...getStoredLeads()].slice(0, MAX_LEADS);
  writeJson(LEADS_KEY, next);
  return next;
}

export function dashboardStatsFromStore() {
  const history = getImportHistory();
  const leads = getStoredLeads();
  const last = history[0] ?? null;

  const byStatus: Record<CrmStatus | "UNKNOWN", number> = {
    GOOD_LEAD_FOLLOW_UP: 0,
    DID_NOT_CONNECT: 0,
    BAD_LEAD: 0,
    SALE_DONE: 0,
    UNKNOWN: 0,
  };
  const bySource: Record<DataSource | "UNKNOWN", number> = {
    leads_on_demand: 0,
    meridian_tower: 0,
    eden_park: 0,
    varah_swamy: 0,
    sarjapur_plots: 0,
    UNKNOWN: 0,
  };

  for (const lead of leads) {
    if (lead.crm_status && lead.crm_status in byStatus) {
      byStatus[lead.crm_status as CrmStatus] += 1;
    } else {
      byStatus.UNKNOWN += 1;
    }
    if (lead.data_source && lead.data_source in bySource) {
      bySource[lead.data_source as DataSource] += 1;
    } else {
      bySource.UNKNOWN += 1;
    }
  }

  return {
    history,
    leads,
    last,
    totals: {
      leads: leads.length,
      clean: leads.filter((l) => l.qualityState === "clean").length,
      needsReview: leads.filter((l) => l.qualityState === "needs_review").length,
      imports: history.length,
      importedRows: history.reduce((s, h) => s + h.totals.imported, 0),
      skippedRows: history.reduce((s, h) => s + h.totals.skipped, 0),
    },
    byStatus,
    bySource,
  };
}
