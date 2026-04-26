"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/content/testimonials", label: "Testimonials" },
  { href: "/admin/content/gallery", label: "Project Gallery" },
  { href: "/admin/content/social", label: "Social Posts" },
  { href: "/admin/content/settings", label: "Site Settings" },
];

/**
 * Tab strip for the Content Management section. Each entry is a real
 * route so the URL stays bookmarkable.
 */
export function ContentTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-charcoal-700">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative inline-flex items-center px-4 py-3 text-xs uppercase tracking-[0.18em] transition",
              active
                ? "text-gold-300"
                : "text-charcoal-400 hover:text-charcoal-100",
            )}
          >
            {t.label}
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-gold-500" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
