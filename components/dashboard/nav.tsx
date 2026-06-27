"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LineChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Experiments", href: "/dashboard/experiments", icon: FlaskConical },
  { title: "Surfaces", href: "/dashboard/surfaces", icon: Layers },
  { title: "Agent", href: "/dashboard/agent", icon: Bot },
  { title: "Insights", href: "/dashboard/insights", icon: LineChart },
];

export const footerNav: NavItem[] = [
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active && "text-primary")}
        aria-hidden
      />
      {item.title}
    </Link>
  );
}

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      <div className="flex flex-col gap-0.5">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-0.5 pt-3">
        {footerNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
