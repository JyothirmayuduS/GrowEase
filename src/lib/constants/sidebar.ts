export interface SidebarItem {
  label: string;
  href: string;
  /** Match this path prefix for active state (defaults to href). */
  match?: string;
}

export const SIDEBAR_MAIN: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Generate Leads", href: "/leads/generate", match: "/leads/generate" },
  { label: "Manage Leads", href: "/leads", match: "/leads" },
  { label: "Engage Leads", href: "/leads/engage", match: "/leads/engage" },
];

export const SIDEBAR_CONTROL: SidebarItem[] = [
  { label: "Team Members", href: "/settings/team" },
  { label: "Lead Sources", href: "/lead-sources", match: "/lead-sources" },
  { label: "Ad Accounts", href: "/integrations/ads" },
  { label: "WhatsApp Account", href: "/integrations/whatsapp" },
  { label: "Tele Calling", href: "/integrations/tele-calling" },
  { label: "CRM Fields", href: "/settings/crm-fields" },
  { label: "API Center", href: "/settings/api" },
];

export const BUSINESS_CENTER_HREF = "/business";

/** Prefer longer matches so /leads/generate wins over /leads. */
export function isSidebarActive(pathname: string, item: SidebarItem): boolean {
  const target = item.match ?? item.href;
  if (target === "/leads") {
    return pathname === "/leads" || pathname === "/leads/";
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}
