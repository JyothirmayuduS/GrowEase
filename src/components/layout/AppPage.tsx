import { AppShell } from "@/components/layout/AppShell";
import { LeadSourcesPage } from "@/components/layout/LeadSourcesPage";

export function AppPage({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <LeadSourcesPage title={title} description={description} eyebrow={eyebrow}>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-5 sm:px-8 sm:py-7">
            {children}
          </div>
        </div>
      </LeadSourcesPage>
    </AppShell>
  );
}
