import { Suspense } from "react";

import IntegrationsSetupClient from "./IntegrationsSetupClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-[var(--ge-text-muted)]">
          Loading…
        </div>
      }
    >
      <IntegrationsSetupClient />
    </Suspense>
  );
}
