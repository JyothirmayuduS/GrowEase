"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AppLogo } from "@/components/icons/AppLogo";
import { useToast } from "@/components/ui/toast";

interface HeaderProps {
  minimal?: boolean;
}

export function Header({ minimal = false }: HeaderProps) {
  const { showToast } = useToast();

  if (minimal) {
    return (
      <header className="relative md:sticky top-0 z-50 w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <AppLogo />
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="relative md:sticky top-0 z-50 w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <AppLogo />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            onClick={() =>
              showToast({
                title: "Growth plan active",
                description: "You’re on the free trial workspace — explore the CRM.",
                variant: "success",
              })
            }
            className="hidden rounded-full bg-[#1473E6] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0D66D0] sm:inline-block"
          >
            Start free trial
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
