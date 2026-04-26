"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavItem = { href: string; label: string; icon: LucideIcon };

interface Props {
  items: BottomNavItem[];
}

/**
 * Fixed bottom tab bar shown only on small screens. Designed for one-handed
 * use on a phone in the field — 56px+ tap targets, no overflow scroll, max
 * five items so labels stay readable in sunlight.
 */
export function BottomNav({ items }: Props) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal-700 bg-charcoal-900/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-[600px] grid-cols-5">
        {items.slice(0, 5).map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/portal" &&
              pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] transition",
                  active
                    ? "text-gold-400"
                    : "text-charcoal-400 hover:text-charcoal-100",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", active ? "text-gold-400" : "text-charcoal-400")}
                  strokeWidth={1.6}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
