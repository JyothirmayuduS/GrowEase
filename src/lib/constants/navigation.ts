export interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  isActive?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "#" },
  { label: "Leads", href: "#", hasDropdown: true },
  { label: "Documents", href: "#" },
  { label: "Edit", href: "#", hasDropdown: true },
  { label: "Import", href: "#", hasDropdown: true, isActive: true },
  { label: "Settings", href: "#", hasDropdown: true },
  { label: "All tools", href: "#" },
];
