"use client";

import {
  BarChart3,
  Building2,
  ChevronRight,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Phone,
  Plug,
  Settings2,
  Users,
  Waypoints,
} from "lucide-react";

import { AppLogo } from "@/components/icons/AppLogo";
import { SIDEBAR_CONTROL, SIDEBAR_MAIN } from "@/lib/constants/sidebar";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutGrid,
  "Generate Leads": Megaphone,
  "Manage Leads": Users,
  "Engage Leads": MessageCircle,
  "Team Members": Users,
  "Lead Sources": Waypoints,
  "Ad Accounts": BarChart3,
  "WhatsApp Account": MessageCircle,
  "Tele Calling": Phone,
  "CRM Fields": Settings2,
  "API Center": Plug,
};

export function Sidebar() {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[#2a2a2a] bg-[#141414] text-white">
      <div className="border-b border-[#2a2a2a] px-5 py-4">
        <AppLogo variant="sidebar" />
      </div>

      <div className="border-b border-[#2a2a2a] px-4 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1473E6] text-xs font-bold">
            VK
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Test Corp</p>
            <p className="text-[11px] text-white/50">OWNER</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/40" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarGroup label="MAIN" items={SIDEBAR_MAIN} />
        <SidebarGroup label="CONTROL CENTER" items={SIDEBAR_CONTROL} className="mt-6" />
      </nav>

      <div className="border-t border-[#2a2a2a] px-4 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Building2 className="h-4 w-4" />
          Business Center
        </button>
      </div>
    </aside>
  );
}

function SidebarGroup({
  label,
  items,
  className,
}: {
  label: string;
  items: typeof SIDEBAR_MAIN;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 px-2 text-[10px] font-semibold tracking-widest text-white/35">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = iconMap[item.label] ?? LayoutGrid;
          return (
            <li key={item.label}>
              <a
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                  item.active
                    ? "bg-[#1e3a2f] font-medium text-[#7dcea0]"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
