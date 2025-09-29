"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

interface SidebarNavProps {
  items: ReadonlyArray<NavItem>;
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "group flex flex-col rounded-xl border border-white/5 px-4 py-3 transition-all", 
              isActive
                ? "bg-white/10 text-white shadow-lg shadow-white/10"
                : "hover:bg-white/5 text-slate-300 hover:text-white",
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wide">
                {item.label}
              </span>
            </div>
            {item.description ? (
              <span className="mt-1 text-xs text-slate-400">
                {item.description}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
