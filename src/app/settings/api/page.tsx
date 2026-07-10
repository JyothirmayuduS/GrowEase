"use client";

import { useEffect, useState } from "react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";

export default function ApiCenterPage() {
  const [health, setHealth] = useState<{
    status: string;
    aiConfigured: boolean;
    provider: string | null;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() =>
        setHealth({ status: "error", aiConfigured: false, provider: null })
      );
  }, []);

  return (
    <AppPage
      title="API Center"
      eyebrow="API Center"
      description="Endpoints, health, and integration readiness"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="API status"
          value={health?.status === "ok" ? "Healthy" : health ? "Degraded" : "…"}
          tone={health?.status === "ok" ? "success" : "warning"}
        />
        <MetricCard
          label="AI configured"
          value={health?.aiConfigured ? "Yes" : health ? "No" : "…"}
          tone={health?.aiConfigured ? "success" : "danger"}
        />
        <MetricCard
          label="Provider"
          value={health?.provider ?? "—"}
          tone="accent"
        />
      </div>

      <PageSection title="Public endpoints" description="Used by the CSV importer">
        <EnterpriseTable
          headers={["Method", "Path", "Purpose", "Auth"]}
          rows={[
            [
              "GET",
              <code key="h" className="font-mono text-[12px]">
                /api/health
              </code>,
              "Cold-start / readiness probe",
              <StatusPill key="ha" label="Public" tone="muted" />,
            ],
            [
              "POST",
              <code key="p" className="font-mono text-[12px]">
                /api/parse
              </code>,
              "Multipart CSV parse (no AI)",
              <StatusPill key="pa" label="App session" tone="accent" />,
            ],
            [
              "POST",
              <code key="i" className="font-mono text-[12px]">
                /api/import
              </code>,
              "AI map → CRM JSON (NDJSON stream)",
              <StatusPill key="ia" label="App session" tone="accent" />,
            ],
          ]}
        />
      </PageSection>

      <PageSection title="Environment" description="Configured on Vercel for production">
        <ul className="space-y-2 text-[13px] text-[var(--ge-text-secondary)]">
          <li>
            <code className="font-mono text-[12px] text-[var(--ge-text)]">AI_PROVIDER</code> —{" "}
            anthropic | openai
          </li>
          <li>
            <code className="font-mono text-[12px] text-[var(--ge-text)]">OPENAI_API_KEY</code> /{" "}
            <code className="font-mono text-[12px] text-[var(--ge-text)]">ANTHROPIC_API_KEY</code>
          </li>
          <li>
            Import max duration: <strong className="text-[var(--ge-text)]">300s</strong> · Parse
            max file: <strong className="text-[var(--ge-text)]">5 MB</strong>
          </li>
          {health?.timestamp ? (
            <li className="text-[12px] text-[var(--ge-text-muted)]">
              Last health check: {new Date(health.timestamp).toLocaleString()}
            </li>
          ) : null}
        </ul>
      </PageSection>
    </AppPage>
  );
}
