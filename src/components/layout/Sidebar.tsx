"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import {
  BUSINESS_CENTER_HREF,
  isSidebarActive,
  SIDEBAR_CONTROL,
  SIDEBAR_MAIN,
  type SidebarItem,
} from "@/lib/constants/sidebar";
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

export function Sidebar({ isDrawer = false }: { isDrawer?: boolean } = {}) {
  const pathname = usePathname() || "/";

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-[#2a2a2a] bg-[#141414] text-white",
        isDrawer ? "w-full border-none" : "w-16 min-[980px]:w-[240px]"
      )}
    >
      <div className={cn("border-b border-[#2a2a2a] py-4", isDrawer ? "px-5" : "px-3 min-[980px]:px-5")}>
        <Link href="/dashboard" className={cn(isDrawer ? "block" : "hidden min-[980px]:block")} aria-label="GrowEasy home">
          <AppLogo variant="sidebar" />
        </Link>
        <Link
          href="/dashboard"
          className={cn("justify-center", isDrawer ? "hidden" : "flex min-[980px]:hidden")}
          aria-label="GrowEasy home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4L12 20M12 4L6 10M12 4L18 10"
                stroke="#141414"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Link>
      </div>

      <div className={cn("border-b border-[#2a2a2a] py-3", isDrawer ? "px-4" : "px-2 min-[980px]:px-4")}>
        <Link
          href="/settings/team"
          aria-label="Jyothirmayudu Srungarapati account"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ge-accent)] text-xs font-bold">
            JS
          </div>
          <div className={cn("min-w-0 flex-1", isDrawer ? "block" : "hidden min-[980px]:block")}>
            <p className="truncate text-sm font-semibold">Jyothirmayudu Srungarapati</p>
            <p className="text-[11px] text-white/50">Owner</p>
          </div>
          <ChevronRight className={cn("h-4 w-4 text-white/40", isDrawer ? "block" : "hidden min-[980px]:block")} aria-hidden="true" />
        </Link>
      </div>

      <nav className={cn("ge-scroll-quiet flex-1 overflow-y-auto py-4", isDrawer ? "px-3" : "px-2 min-[980px]:px-3")} aria-label="Main">
        <SidebarGroup label="Main" items={SIDEBAR_MAIN} pathname={pathname} isDrawer={isDrawer} />
        <SidebarGroup
          label="Control center"
          items={SIDEBAR_CONTROL}
          pathname={pathname}
          className="mt-6"
          isDrawer={isDrawer}
        />
      </nav>

      <div className={cn("border-t border-[#2a2a2a] py-4", isDrawer ? "px-4" : "px-2 min-[980px]:px-4")}>
        <Link
          href={BUSINESS_CENTER_HREF}
          aria-label="Business center"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
            isSidebarActive(pathname, { label: "Business", href: BUSINESS_CENTER_HREF })
              ? "bg-[#1e3a2f] font-semibold text-[#7dcea0]"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={cn(isDrawer ? "inline" : "hidden min-[980px]:inline")}>Business center</span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarGroup({
  label,
  items,
  pathname,
  className,
  isDrawer = false,
}: {
  label: string;
  items: SidebarItem[];
  pathname: string;
  className?: string;
  isDrawer?: boolean;
}) {
  return (
    <div className={className}>
      <p className={cn("mb-2 px-2 text-[10px] font-semibold tracking-widest text-white/35", isDrawer ? "block" : "hidden min-[980px]:block")}>
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = iconMap[item.label] ?? LayoutGrid;
          const active = isSidebarActive(pathname, item);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                  isDrawer ? "justify-start" : "justify-center min-[980px]:justify-start",
                  active
                    ? "bg-[#1e3a2f] font-semibold text-[#7dcea0]"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                <span className={cn(isDrawer ? "inline" : "hidden min-[980px]:inline")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
