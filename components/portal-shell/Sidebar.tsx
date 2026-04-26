"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export function Sidebar({
  items,
  eyebrow,
}: {
  items: NavItem[];
  eyebrow: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="px-3 py-3">
        <p className="rw-eyebrow">{eyebrow}</p>
      </div>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" &&
            item.href !== "/portal" &&
            pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-gold-500/10 text-gold-300 border border-gold-500/30"
                : "text-charcoal-300 hover:bg-charcoal-700/60 hover:text-charcoal-50 border border-transparent",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4",
                active ? "text-gold-400" : "text-charcoal-400 group-hover:text-charcoal-200",
              )}
              strokeWidth={1.6}
            />
            <span className="tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
