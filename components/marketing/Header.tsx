import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const nav = [
  { href: "/#what-we-do", label: "What We Do" },
  { href: "/#approach", label: "Our Approach" },
  { href: "/#founder", label: "Founder" },
  { href: "/#contact", label: "Contact" },
];

export function MarketingHeader() {
  return (
    <header className="relative z-20 border-b border-charcoal-800/80 bg-charcoal-900/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        {/*
         * Plain <a> tags for hash navigation: next/link will URL-encode
         * the "#" in href="/#what-we-do" → "/%23what-we-do" in some
         * cross-route flows. Native anchors avoid that and give us free
         * smooth-scroll on the same page.
         */}
        <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em]">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-charcoal-300 hover:text-gold-400 transition"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs uppercase tracking-[0.2em] text-charcoal-300 hover:text-gold-400 transition"
          >
            Client Login
          </Link>
        </div>
      </div>
    </header>
  );
}
