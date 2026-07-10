import type { CrmLeadRecord } from "@/lib/types/crm";

export interface FieldIssue {
  field: keyof CrmLeadRecord;
  message: string;
}

export interface RecordQuality {
  confidence: number;
  flagged: boolean;
  issues: FieldIssue[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CIRCUMFERENCE = 2 * Math.PI * 9; // r=9 → ~56.55

export function ringDashOffset(confidence: number): number {
  const clamped = Math.max(0, Math.min(100, confidence));
  return CIRCUMFERENCE * (1 - clamped / 100);
}

export function ringStroke(confidence: number): string {
  if (confidence >= 85) return "var(--ge-success)";
  if (confidence >= 60) return "var(--ge-warning)";
  return "var(--ge-danger)";
}

export function assessRecordQuality(record: CrmLeadRecord): RecordQuality {
  const issues: FieldIssue[] = [];
  let score = 100;

  if (!record.name.trim()) {
    issues.push({ field: "name", message: "missing name" });
    score -= 20;
  }

  if (!record.email.trim()) {
    issues.push({ field: "email", message: "missing" });
    score -= 18;
  } else if (!EMAIL_RE.test(record.email)) {
    issues.push({ field: "email", message: "invalid email" });
    score -= 22;
  }

  const mobile = record.mobile_without_country_code.replace(/\D/g, "");
  if (!mobile) {
    issues.push({ field: "mobile_without_country_code", message: "missing" });
    score -= 12;
  } else if (mobile.length < 8 || mobile.length > 15) {
    issues.push({ field: "mobile_without_country_code", message: "suspicious length" });
    score -= 16;
  }

  if (!record.country_code.trim()) {
    issues.push({ field: "country_code", message: "missing" });
    score -= 8;
  } else if (!/^\+?\d{1,4}$/.test(record.country_code.trim())) {
    issues.push({ field: "country_code", message: "invalid code" });
    score -= 12;
  }

  if (!record.company.trim()) score -= 4;
  if (!record.city.trim()) score -= 3;
  if (!record.lead_owner.trim()) score -= 3;
  if (!record.crm_status) score -= 2;

  const confidence = Math.max(12, Math.min(100, Math.round(score)));
  const flagged = issues.some((i) =>
    ["email", "mobile_without_country_code", "country_code", "name"].includes(i.field)
  );

  return { confidence, flagged, issues };
}

export function displayValue(value: string, emptyLabel = "not provided"): { text: string; muted: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { text: emptyLabel, muted: true };
  return { text: trimmed, muted: false };
}

export function formatCrmStage(status: string): string {
  if (!status.trim()) return "new";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
