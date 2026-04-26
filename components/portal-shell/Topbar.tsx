import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/brand/Logo";

export function Topbar({
  user,
  scope,
}: {
  user: { email?: string | null; full_name?: string | null } | null;
  scope: "Staff" | "Client";
}) {
  return (
    <header className="flex items-center justify-between border-b border-charcoal-800 bg-charcoal-900/80 backdrop-blur px-6 py-4">
      <div className="flex items-center gap-4">
        <Logo size="sm" href={scope === "Staff" ? "/admin" : "/portal"} />
        <span className="hidden sm:inline-flex items-center rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-gold-300">
          {scope}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right hidden sm:block">
          <p className="text-charcoal-100">{user?.full_name ?? "—"}</p>
          <p className="text-xs text-charcoal-400">{user?.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-charcoal-600 bg-charcoal-800 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-charcoal-200 hover:border-gold-500/60 hover:text-gold-400 transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
