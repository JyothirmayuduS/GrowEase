import { Suspense } from "react";

import AdAccountsClient from "./AdAccountsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-[var(--ge-text-muted)]">
          Loading ad accounts…
        </div>
      }
    >
      <AdAccountsClient />
    </Suspense>
  );
}
