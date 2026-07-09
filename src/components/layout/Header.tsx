"use client";

import { motion } from "framer-motion";
import { Bell, HelpCircle, Search } from "lucide-react";

import { AppLogo } from "@/components/icons/AppLogo";
import { Button } from "@/components/ui/button";
import { HeaderNav } from "@/components/layout/HeaderNav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white">
      <div className="mx-auto flex h-[52px] max-w-[1440px] items-center justify-between px-6">
        <AppLogo />
        <HeaderNav />

        <div className="flex items-center gap-1">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="mr-2 hidden h-8 rounded-full bg-[#1473E6] px-4 text-[13px] font-semibold text-white hover:bg-[#0D66D0] sm:inline-flex">
              Start free trial
            </Button>
          </motion.div>

          <HeaderIconButton icon={Search} label="Search" />
          <HeaderIconButton icon={HelpCircle} label="Help" className="hidden sm:flex" />
          <HeaderIconButton icon={Bell} label="Notifications" className="hidden sm:flex" />

          <button
            type="button"
            aria-label="User profile"
            className="ml-1.5 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#E0E0E0] bg-[#E8F0FE]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="#1473E6" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="#1473E6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

interface HeaderIconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
}

function HeaderIconButton({ icon: Icon, label, className }: HeaderIconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-[#505050] transition-colors hover:bg-[#F5F5F5] ${className ?? ""}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </motion.button>
  );
}
