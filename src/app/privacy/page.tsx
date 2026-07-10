import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "How GrowEasy CRM handles Google, Microsoft, and Meta account data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[14px] leading-relaxed text-[var(--ge-text)]">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
        GrowEasy CRM
      </p>
      <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-[13px] text-[var(--ge-text-secondary)]">
        Last updated: 10 July 2026 · Contact:{" "}
        <a href="mailto:varun@groweasy.ai" className="text-[var(--ge-accent)] hover:underline">
          varun@groweasy.ai
        </a>
      </p>

      <div className="mt-8 space-y-6 text-[var(--ge-text-secondary)]">
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">1. Who we are</h2>
          <p className="mt-2">
            GrowEasy CRM (“GrowEasy”, “we”) is a lead-generation CRM for real-estate teams. This
            policy explains how we handle data when you use{" "}
            <a href="https://growease.vercel.app" className="text-[var(--ge-accent)] hover:underline">
              growease.vercel.app
            </a>{" "}
            or a self-hosted copy of the product.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">2. Data we process</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--ge-text)]">CSV / lead files</strong> you upload or
              import from Google Drive or OneDrive (names, emails, phones, and other columns in the
              file).
            </li>
            <li>
              <strong className="text-[var(--ge-text)]">OAuth tokens</strong> when you connect Google,
              Microsoft, or Meta — used only to list/download files you choose or read ad account /
              Lead Ads metadata you authorize.
            </li>
            <li>
              <strong className="text-[var(--ge-text)]">Account profile basics</strong> returned by
              the provider (e.g. email, display name) to show connection status.
            </li>
            <li>
              <strong className="text-[var(--ge-text)]">AI mapping inputs</strong> — row samples sent
              to the configured AI provider (OpenAI / Anthropic) solely to map columns into CRM
              fields.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">3. Google user data</h2>
          <p className="mt-2">
            If you connect Google, we request limited OAuth scopes such as email/profile, Google
            Drive read access (to list and download CSV / Sheets you select), and optionally Google
            Ads access (to list accessible customers). We use Google user data only to provide these
            features inside GrowEasy. We do not sell Google user data. We do not use Google user data
            for advertising. Tokens are stored in encrypted httpOnly cookies on your browser session
            and are not shared with third parties except the AI provider when you run an import on
            file contents you chose to import.
          </p>
          <p className="mt-2">
            You can disconnect Google anytime in the app (Drive picker or Ad Accounts → Disconnect),
            which deletes the stored token cookie. You may also revoke access at{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-[var(--ge-accent)] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Google Account permissions
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">4. Microsoft & Meta</h2>
          <p className="mt-2">
            OneDrive and Facebook connections follow the same pattern: read-only access needed for
            CSV import or Lead Ads forms, tokens in encrypted cookies, disconnect removes access from
            GrowEasy.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">5. Retention</h2>
          <p className="mt-2">
            Import results may be kept in your browser local storage for history. OAuth cookies expire
            or are cleared on disconnect. Server logs may retain short-lived operational data. Demo
            deployments may not operate a separate long-term customer database.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">6. Security</h2>
          <p className="mt-2">
            We use HTTPS in production, encrypted cookie storage for tokens, and least-privilege
            OAuth scopes. No method of transmission is 100% secure; use strong account passwords on
            Google / Microsoft / Meta.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">7. Contact</h2>
          <p className="mt-2">
            Privacy questions:{" "}
            <a href="mailto:varun@groweasy.ai" className="text-[var(--ge-accent)] hover:underline">
              varun@groweasy.ai
            </a>
          </p>
        </section>
      </div>

      <p className="mt-10 text-[13px]">
        <Link href="/terms" className="font-semibold text-[var(--ge-accent)] hover:underline">
          Terms of Service
        </Link>
        {" · "}
        <Link href="/dashboard" className="font-semibold text-[var(--ge-accent)] hover:underline">
          Back to app
        </Link>
      </p>
    </main>
  );
}
