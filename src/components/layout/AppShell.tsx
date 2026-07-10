"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  className?: string;
}

export function AppShell({ children, showSidebar = true, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    /*
     * Mobile  : normal document flow — body scrolls, no height trap
     * Desktop : classic sidebar layout — h-screen, overflow-hidden flex row
     */
    <div className="flex min-h-dvh flex-col bg-[var(--ge-page-bg)] md:h-screen md:flex-row md:overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      {showSidebar && (
        <div className="hidden h-full shrink-0 md:flex">
          <Sidebar />
        </div>
      )}

      {/* Mobile Drawer Sidebar Overlay */}
      {showSidebar && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar container */}
          <div className="relative flex w-[240px] max-w-xs flex-1 flex-col bg-[#141414] focus:outline-none">
            {/* Close button */}
            <div className="absolute right-2 top-2 z-50">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Sidebar component inside drawer */}
            <div className="h-full w-full [&_aside]:w-full [&_aside]:border-none">
              <Sidebar isDrawer />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn("flex min-w-0 flex-1 flex-col", className)}>
        {/* Mobile Header Bar */}
        {showSidebar && (
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#141414] px-4 text-white md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight">GrowEasy</span>
            <div className="w-9" /> {/* Spacer */}
          </header>
        )}

        {/*
         * Mobile  : flex-col, no overflow constraint — body scrolls
         * Desktop : min-h-0 overflow-hidden for nested scroll regions
         */}
        <main className={cn(
          "flex flex-1 flex-col md:min-h-0 md:overflow-hidden",
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
