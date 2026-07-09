import type { CrmLeadRecord } from "@/lib/types/crm";

export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export const CRM_FIELDS: (keyof CrmLeadRecord)[] = [
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
];

export const CRM_FIELD_LABELS: Record<keyof CrmLeadRecord, string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Country Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "CRM Status",
  crm_note: "CRM Note",
  data_source: "Data Source",
  possession_time: "Possession Time",
  description: "Description",
};

export const DEFAULT_BATCH_SIZE = 15;
export const MAX_RETRIES = 3;
