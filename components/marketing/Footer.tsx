import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function MarketingFooter() {
  return (
    <footer className="relative z-20 border-t border-gold-500/12 bg-charcoal-900">
      <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="text-xs tracking-[0.12em] text-charcoal-400">
          © {new Date().getFullYear()} Roach Wood. All rights reserved.
        </p>
        <div className="flex gap-7">
          <a
            href="#"
            className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-400 hover:text-gold-400 transition"
          >
            Instagram
          </a>
          <a
            href="#"
            className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-400 hover:text-gold-400 transition"
          >
            Houzz
          </a>
          <Link
            href="/login"
            className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-400 hover:text-gold-400 transition"
          >
            Client Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
