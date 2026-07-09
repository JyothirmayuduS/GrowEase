export type CrmStatus =
  | "GOOD_LEAD_FOLLOW_UP"
  | "DID_NOT_CONNECT"
  | "BAD_LEAD"
  | "SALE_DONE";

export type DataSource =
  | "leads_on_demand"
  | "meridian_tower"
  | "eden_park"
  | "varah_swamy"
  | "sarjapur_plots";

export interface CrmLeadRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  rowIndex: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ImportTotals {
  imported: number;
  skipped: number;
  total: number;
}

export interface ImportApiResponse {
  imported: CrmLeadRecord[];
  skipped: SkippedRecord[];
  totals: ImportTotals;
}

export interface ImportApiRequest {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

export type ImportStreamEvent =
  | { type: "progress"; percent: number; status: string; batch: number; totalBatches: number }
  | { type: "complete"; data: ImportApiResponse }
  | { type: "error"; message: string };
