import Link from "next/link";
import { Plus, Camera, Wallet, UserPlus } from "lucide-react";

const actions = [
  { href: "/admin/jobs/new", label: "New Job", icon: Plus },
  { href: "/admin/clients/new", label: "New Client", icon: UserPlus },
  { href: "/admin/expenses/new", label: "Log Expense", icon: Wallet },
  { href: "/admin/documents", label: "Upload Photo", icon: Camera },
];

/**
 * Always-visible bar of one-tap shortcuts for the admin dashboard. Stacks
 * on mobile so the buttons stay full-width and large enough for outdoor use.
 */
export function QuickActionsBar() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group inline-flex h-14 items-center justify-center gap-2 rounded-md border border-charcoal-700 bg-charcoal-800 px-4 text-sm font-medium text-charcoal-100 transition hover:border-gold-500/60 hover:bg-charcoal-700"
        >
          <a.icon className="h-5 w-5 text-gold-400 group-hover:text-gold-300" strokeWidth={1.6} />
          <span>{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
