"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Hammer,
  Plus,
  Receipt,
  Globe,
  FileCheck2,
  FileText,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Scope = "admin" | "portal";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Icons live inside the client component so the parent server layout
// never has to pass component references across the RSC boundary —
// passing functions to client components is what triggers the
// "Functions cannot be passed directly to Client Components" error.
const ITEMS: Record<Scope, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Today", icon: LayoutDashboard },
    { href: "/admin/jobs", label: "Jobs", icon: Hammer },
    { href: "/admin/expenses/new", label: "Log", icon: Plus },
    { href: "/admin/invoices", label: "Bills", icon: Receipt },
    { href: "/admin/content", label: "Site", icon: Globe },
  ],
  portal: [
    { href: "/portal", label: "Home", icon: LayoutDashboard },
    { href: "/portal/jobs", label: "Projects", icon: Hammer },
    { href: "/portal/approvals", label: "Approvals", icon: FileCheck2 },
    { href: "/portal/payments", label: "Pay", icon: CreditCard },
    { href: "/portal/documents", label: "Files", icon: FileText },
  ],
};

export interface BottomNavBadges {
  approvals?: number;
  payments?: number;
  projects?: number;
}

interface Props {
  scope: Scope;
  badges?: BottomNavBadges;
}

/**
 * Fixed bottom tab bar shown only on small screens. Designed for
 * one-handed use on a phone in the field — 56px+ tap targets, no
 * overflow scroll, max five items so labels stay readable in sunlight.
 */
export function BottomNav({ scope, badges }: Props) {
  const pathname = usePathname();
  const items = ITEMS[scope];

  function badgeCountFor(href: string): number {
    if (!badges) return 0;
    if (href === "/portal/approvals") return badges.approvals ?? 0;
    if (href === "/portal/payments") return badges.payments ?? 0;
    if (href === "/portal/jobs") return badges.projects ?? 0;
    return 0;
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal-700 bg-charcoal-900/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-[600px] grid-cols-5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/portal" &&
              pathname.startsWith(item.href));
          const count = badgeCountFor(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] transition",
                  active
                    ? "text-gold-400"
                    : "text-charcoal-400 hover:text-charcoal-100",
                )}
              >
                <span className="relative">
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-gold-400" : "text-charcoal-400",
                    )}
                    strokeWidth={1.6}
                  />
                  {count > 0 ? (
                    <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                      {count > 9 ? "9+" : count}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
