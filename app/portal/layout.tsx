import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/portal-shell/Sidebar";
import { Topbar } from "@/components/portal-shell/Topbar";
import { BottomNav } from "@/components/portal-shell/BottomNav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single<{ role: string; full_name: string | null; email: string | null }>();

  // Nav badge counts. RLS scopes everything to this client's rows
  // automatically. Two head-only counts + a tiny invoice slice — no
  // big payloads on every page render.
  const [pendingEstimatesRes, pendingChangeOrdersRes, unpaidInvoicesRes] =
    await Promise.all([
      supabase
        .from("estimates")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
      supabase
        .from("change_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
      supabase
        .from("invoices")
        .select("total, amount_paid, status")
        .in("status", ["sent", "overdue"]),
    ]);

  const approvalsCount =
    (pendingEstimatesRes.count ?? 0) + (pendingChangeOrdersRes.count ?? 0);
  const paymentsCount = (unpaidInvoicesRes.data ?? []).filter((i) => {
    const due = Number(i.total ?? 0) - Number(i.amount_paid ?? 0);
    return due > 0;
  }).length;

  const badges = {
    approvals: approvalsCount,
    payments: paymentsCount,
  };

  return (
    <div className="min-h-screen bg-charcoal-900">
      <Topbar user={profile ?? { email: user.email }} scope="Client" />
      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-charcoal-800 lg:block lg:min-h-[calc(100vh-65px)]">
          <Sidebar scope="portal" badges={badges} />
        </aside>
        <main className="px-4 py-6 pb-24 sm:px-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav scope="portal" badges={badges} />
    </div>
  );
}
