export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number];

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

export const SOURCE_TYPES = [
  "manual_upload",
  "google_drive",
  "outlook_attachment",
  "onedrive",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const IMPORT_STATUSES = [
  "uploaded",
  "previewed",
  "processing",
  "mapping",
  "validating",
  "importing",
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
] as const;

export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const INTEGRATION_PROVIDERS = [
  "google_drive",
  "microsoft_outlook",
  "onedrive",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const CRM_TARGET_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmTargetField = (typeof CRM_TARGET_FIELDS)[number];

export interface ExtractedLead {
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
  confidence: number;
  original_record: Record<string, string>;
  row_number?: number;
  skip?: boolean;
  skip_reason?: string;
  validation_errors?: string[];
}

export interface ColumnMapping {
  source_column: string;
  target_field: CrmTargetField | "";
  confidence: number;
  status: "mapped" | "unmapped" | "ambiguous";
  ai_reason: string;
}

export interface ColumnMappingResult {
  mappings: ColumnMapping[];
}

export interface ExtractedRecordResult {
  records: ExtractedLead[];
}

export interface ImportPipelineInput {
  userId: string;
  sourceType: SourceType;
  filename: string;
  fileBuffer: Buffer;
  sourceMetadata?: Record<string, unknown>;
  /** If true, only parse + map; do not run full import. */
  previewOnly?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}
