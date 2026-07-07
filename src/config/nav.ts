import { Home, LayoutDashboard, Settings, Users, type LucideIcon } from "lucide-react";

import type { Route } from "next";

export type NavItem = {
  title: string;
  href: Route;
  icon: LucideIcon;
};

/**
 * Primary navigation. Only routes that exist are listed (typed routes are
 * enforced at build). Add product sections here as they ship.
 */
export const mainNav: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Members", href: "/settings/members", icon: Users },
  { title: "Settings", href: "/settings/organization", icon: Settings },
];
