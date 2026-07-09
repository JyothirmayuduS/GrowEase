"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

export function HeaderNav() {
  return (
    <NavigationMenu className="hidden max-w-none flex-1 justify-center lg:flex">
      <NavigationMenuList className="gap-1">
        {NAV_ITEMS.map((item) => (
          <NavigationMenuItem key={item.label}>
            <NavigationMenuLink
              href={item.href}
              className={cn(
                "relative inline-flex h-auto items-center gap-0.5 rounded-none bg-transparent px-3 py-2 text-[13px] font-normal text-[#2C2C2C] hover:bg-transparent hover:text-[#2C2C2C] focus:bg-transparent",
                item.isActive && "font-medium"
              )}
            >
              {item.label}
              {item.hasDropdown && (
                <ChevronDown className="ml-0.5 h-3 w-3 opacity-70" />
              )}
              {item.isActive && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-[#2C2C2C]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
