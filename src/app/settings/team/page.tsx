"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Mail, Shield, UserPlus, X } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";
import {
  EnterpriseTable,
  MetricCard,
  PageSection,
  StatusPill,
} from "@/components/ui/enterprise";
import { useToast } from "@/components/ui/toast";
import { DEMO_TEAM } from "@/lib/demo/seed-data";

const INVITES_KEY = "ge-team-invites-v1";

type TeamMember = (typeof DEMO_TEAM)[number];

function readInvites(): TeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamMember[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvites(invites: TeamMember[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
}

export default function TeamMembersPage() {
  const { showToast } = useToast();
  const titleId = useId();
  const [invites, setInvites] = useState<TeamMember[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Agent" | "Sales lead">("Agent");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setInvites(readInvites());
  }, []);

  const members = useMemo(() => [...DEMO_TEAM, ...invites], [invites]);

  const sendInvite = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!trimmedName || !trimmedEmail.includes("@")) {
      showToast({
        title: "Check invite details",
        description: "Enter a name and valid email.",
        variant: "error",
      });
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
      showToast({
        title: "Already on the team",
        description: trimmedEmail,
        variant: "error",
      });
      return;
    }

    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    const next: TeamMember = {
      name: trimmedName,
      email: trimmedEmail,
      role,
      status: "Invited",
    };
    const updated = [...invites, next];
    writeInvites(updated);
    setInvites(updated);
    setSending(false);
    setModalOpen(false);
    setName("");
    setEmail("");
    setRole("Agent");
    showToast({
      title: "Invite sent",
      description: `${trimmedName} · ${trimmedEmail}`,
      variant: "success",
    });
  }, [email, invites, members, name, role, showToast]);

  return (
    <AppPage
      title="Team Members"
      eyebrow="Organization Settings"
      description="Roles, invites, and lead ownership for Jyothirmayudu Srungarapati"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ge-text)]">
            People
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ge-text-secondary)]">
            Owners manage seats; agents own leads in Manage & Engage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ge-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite member
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Members" value={members.length} />
        <MetricCard
          label="Active"
          value={members.filter((t) => t.status === "Active").length}
          tone="success"
        />
        <MetricCard
          label="Invited"
          value={members.filter((t) => t.status === "Invited").length}
          tone="warning"
        />
      </div>

      <PageSection title="Directory" description="Email is used as lead_owner on imports">
        <EnterpriseTable
          headers={["Name", "Email", "Role", "Status", ""]}
          rows={members.map((m) => [
            <div key={m.email} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ge-accent-tint)] text-[11px] font-bold text-[var(--ge-accent)]">
                {m.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="font-semibold">{m.name}</span>
            </div>,
            <span
              key={`${m.email}-e`}
              className="inline-flex items-center gap-1.5 font-mono text-[12px]"
            >
              <Mail className="h-3 w-3 text-[var(--ge-text-muted)]" />
              {m.email}
            </span>,
            <span key={`${m.email}-r`} className="inline-flex items-center gap-1">
              {m.role === "Owner" ? (
                <Shield className="h-3 w-3 text-[var(--ge-accent)]" />
              ) : null}
              {m.role}
            </span>,
            <StatusPill
              key={`${m.email}-s`}
              label={m.status}
              tone={m.status === "Active" ? "success" : "warning"}
            />,
            <Link
              key={`${m.email}-l`}
              href="/leads"
              className="text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
            >
              View leads
            </Link>,
          ])}
        />
      </PageSection>

      <PageSection title="Roles" description="Access model for GrowEasy CRM">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { role: "Owner", perms: "Billing, invites, API keys, all leads" },
            { role: "Sales lead", perms: "Assign owners, campaigns, export CSV" },
            { role: "Agent", perms: "Own leads, Engage queue, import CSV" },
          ].map((r) => (
            <div
              key={r.role}
              className="rounded-[var(--ge-radius-lg)] border border-[var(--ge-border)] bg-[var(--ge-panel)] p-4"
            >
              <p className="text-[14px] font-semibold text-[var(--ge-text)]">{r.role}</p>
              <p className="mt-1.5 text-[12.5px] text-[var(--ge-text-secondary)]">{r.perms}</p>
            </div>
          ))}
        </div>
        <Link
          href="/business"
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ge-accent)] hover:underline"
        >
          Business center & seats <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PageSection>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--ge-border)] bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-[var(--ge-border)] px-5 py-4">
              <div>
                <h2 id={titleId} className="text-[15px] font-semibold text-[var(--ge-text)]">
                  Invite teammate
                </h2>
                <p className="text-[12px] text-[var(--ge-text-muted)]">
                  They get email access to GrowEasy CRM
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-[var(--ge-text-muted)] hover:bg-[var(--ge-surface)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <label className="block">
                <span className="text-[12px] font-semibold text-[var(--ge-text-secondary)]">
                  Full name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ge-accent)]"
                  placeholder="Priya Sharma"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[var(--ge-text-secondary)]">
                  Work email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ge-accent)]"
                  placeholder="priya@testcorp.in"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[var(--ge-text-secondary)]">
                  Role
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "Agent" | "Sales lead")}
                  className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ge-accent)]"
                >
                  <option value="Agent">Agent</option>
                  <option value="Sales lead">Sales lead</option>
                </select>
              </label>
              <button
                type="button"
                disabled={sending}
                onClick={sendInvite}
                className="ge-btn-primary mt-2 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px] disabled:opacity-70"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send invite"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppPage>
  );
}
