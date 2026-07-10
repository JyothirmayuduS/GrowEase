import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--ge-page)] px-6 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--ge-text-muted)]">
        404
      </p>
      <h1 className="mt-2 font-display text-[28px] font-semibold text-[var(--ge-text)]">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-[14px] text-[var(--ge-text-secondary)]">
        That route is not part of GrowEasy CRM. Head back to the dashboard or Lead Sources.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/dashboard" className="ge-btn-primary px-4 py-2 text-[13px]">
          Dashboard
        </Link>
        <Link href="/lead-sources" className="ge-btn-secondary px-4 py-2 text-[13px]">
          Lead Sources
        </Link>
      </div>
    </div>
  );
}
