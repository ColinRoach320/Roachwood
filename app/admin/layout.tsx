import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Hammer,
  Users,
  FileText,
  Receipt,
  Wallet,
  ClipboardList,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/portal-shell/Sidebar";
import { Topbar } from "@/components/portal-shell/Topbar";
import { BottomNav } from "@/components/portal-shell/BottomNav";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Jobs", icon: Hammer },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/expenses", label: "Expenses", icon: Wallet },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/content", label: "Site Content", icon: Globe },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single<{ role: string; full_name: string | null; email: string | null }>();

  if (profile?.role !== "admin") redirect("/portal");

  return (
    <div className="min-h-screen bg-charcoal-900">
      <Topbar user={profile ?? { email: user.email }} scope="Staff" />
      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-charcoal-800 lg:block lg:min-h-[calc(100vh-65px)]">
          <Sidebar items={nav} eyebrow="Workshop" />
        </aside>
        <main className="px-4 py-6 pb-24 sm:px-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav scope="admin" />
    </div>
  );
}
