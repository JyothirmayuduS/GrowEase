"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  className?: string;
}

export function AppShell({ children, showSidebar = true, className }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--ge-page-bg)]">
      {showSidebar && <Sidebar />}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
