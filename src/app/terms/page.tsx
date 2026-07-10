import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms for using GrowEasy CRM and connected integrations.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[14px] leading-relaxed text-[var(--ge-text)]">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
        GrowEasy CRM
      </p>
      <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em]">
        Terms of Service
      </h1>
      <p className="mt-2 text-[13px] text-[var(--ge-text-secondary)]">Last updated: 10 July 2026</p>

      <div className="mt-8 space-y-6 text-[var(--ge-text-secondary)]">
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">1. Service</h2>
          <p className="mt-2">
            GrowEasy provides CSV lead import, CRM views, and optional connections to Google Drive,
            OneDrive, Facebook Lead Ads, and Google Ads. Features depend on API keys and third-party
            approvals you configure.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">2. Your responsibilities</h2>
          <p className="mt-2">
            You must have rights to upload or import lead data. You are responsible for complying
            with Google, Microsoft, and Meta terms when connecting those accounts, and with
            applicable privacy / telemarketing laws for contacting leads.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">3. Third-party services</h2>
          <p className="mt-2">
            Google, Microsoft, Meta, OpenAI, Anthropic, and hosting providers (e.g. Vercel) process
            data under their own terms. GrowEasy is not liable for outages or policy changes by those
            providers.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">4. Disclaimer</h2>
          <p className="mt-2">
            The service is provided “as is” without warranties. Demo / evaluation deployments may
            change without notice.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--ge-text)]">5. Contact</h2>
          <p className="mt-2">
            <a href="mailto:varun@groweasy.ai" className="text-[var(--ge-accent)] hover:underline">
              varun@groweasy.ai
            </a>
          </p>
        </section>
      </div>

      <p className="mt-10 text-[13px]">
        <Link href="/privacy" className="font-semibold text-[var(--ge-accent)] hover:underline">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/dashboard" className="font-semibold text-[var(--ge-accent)] hover:underline">
          Back to app
        </Link>
      </p>
    </main>
  );
}
