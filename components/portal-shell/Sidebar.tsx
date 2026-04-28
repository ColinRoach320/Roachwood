"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Hammer,
  Users,
  ClipboardList,
  Receipt,
  Wallet,
  FileText,
  Globe,
  FileCheck2,
  HardHat,
  ShieldCheck,
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

// Icons live inside the client module so the parent server layout never
// passes component references across the RSC boundary. Same pattern as
// BottomNav — passing functions to client components throws
// "Functions cannot be passed directly to Client Components".
const ADMIN_BASE: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Jobs", icon: Hammer },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/expenses", label: "Expenses", icon: Wallet },
  { href: "/admin/subcontractors", label: "Subcontractors", icon: HardHat },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/content", label: "Site Content", icon: Globe },
];

const PORTAL_ITEMS: NavItem[] = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/jobs", label: "Projects", icon: Hammer },
  { href: "/portal/approvals", label: "Approvals", icon: FileCheck2 },
  { href: "/portal/documents", label: "Documents", icon: FileText },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
];

const EYEBROW: Record<Scope, string> = {
  admin: "Workshop",
  portal: "Your projects",
};

/** Counts shown as red dots/numbers on portal nav items. */
export interface NavBadges {
  approvals?: number;
  payments?: number;
  projects?: number;
}

interface Props {
  scope: Scope;
  /** Profile role — drives super-admin-only items like Team. */
  role?: string;
  /** Optional unread/action counts per route for the badge dots. */
  badges?: NavBadges;
}

export function Sidebar({ scope, role, badges }: Props) {
  const pathname = usePathname();
  const items: NavItem[] =
    scope === "admin"
      ? role === "super_admin"
        ? [
            ...ADMIN_BASE,
            { href: "/admin/team", label: "Team", icon: ShieldCheck },
          ]
        : ADMIN_BASE
      : PORTAL_ITEMS;

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="px-3 py-3">
        <p className="rw-eyebrow">{EYEBROW[scope]}</p>
      </div>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" &&
            item.href !== "/portal" &&
            pathname.startsWith(item.href));
        const count = badgeCountFor(item.href, badges);
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
                active
                  ? "text-gold-400"
                  : "text-charcoal-400 group-hover:text-charcoal-200",
              )}
              strokeWidth={1.6}
            />
            <span className="tracking-wide flex-1">{item.label}</span>
            {count > 0 ? (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function badgeCountFor(href: string, badges?: NavBadges): number {
  if (!badges) return 0;
  if (href === "/portal/approvals") return badges.approvals ?? 0;
  if (href === "/portal/payments") return badges.payments ?? 0;
  if (href === "/portal/jobs") return badges.projects ?? 0;
  return 0;
}
