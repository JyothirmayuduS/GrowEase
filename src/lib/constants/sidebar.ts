export interface SidebarItem {
  label: string;
  href: string;
  active?: boolean;
}

export const SIDEBAR_MAIN: SidebarItem[] = [
  { label: "Dashboard", href: "#" },
  { label: "Generate Leads", href: "#" },
  { label: "Manage Leads", href: "#" },
  { label: "Engage Leads", href: "#" },
];

export const SIDEBAR_CONTROL: SidebarItem[] = [
  { label: "Team Members", href: "#" },
  { label: "Lead Sources", href: "#", active: true },
  { label: "Ad Accounts", href: "#" },
  { label: "WhatsApp Account", href: "#" },
  { label: "Tele Calling", href: "#" },
  { label: "CRM Fields", href: "#" },
  { label: "API Center", href: "#" },
];
