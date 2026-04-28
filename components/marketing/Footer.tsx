import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

export async function MarketingFooter() {
  // Pull the social URLs from site_settings so Colin can update them
  // from /admin/content/settings without touching code. The marketing
  // pages render dynamically anyway (Next ƒ), so the read happens on
  // every request — no stale-cache concerns.
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("instagram_url, houzz_url")
    .eq("id", 1)
    .maybeSingle<Pick<SiteSettings, "instagram_url" | "houzz_url">>();

  return (
    <footer className="relative z-20 border-t border-gold-500/12 bg-charcoal-900">
      <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="text-xs tracking-[0.12em] text-charcoal-400">
          © {new Date().getFullYear()} Roachwood. All rights reserved.
        </p>
        <div className="flex gap-7">
          {settings?.instagram_url ? (
            <a
              href={settings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-400 hover:text-gold-400 transition"
            >
              Instagram
            </a>
          ) : null}
          {settings?.houzz_url ? (
            <a
              href={settings.houzz_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-400 hover:text-gold-400 transition"
            >
              Houzz
            </a>
          ) : null}
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
