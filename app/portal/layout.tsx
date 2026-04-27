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

  return (
    <div className="min-h-screen bg-charcoal-900">
      <Topbar user={profile ?? { email: user.email }} scope="Client" />
      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-charcoal-800 lg:block lg:min-h-[calc(100vh-65px)]">
          <Sidebar scope="portal" />
        </aside>
        <main className="px-4 py-6 pb-24 sm:px-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav scope="portal" />
    </div>
  );
}
