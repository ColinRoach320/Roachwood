import { redirect } from "next/navigation";
import { LayoutDashboard, Hammer, FileCheck2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/portal-shell/Sidebar";
import { Topbar } from "@/components/portal-shell/Topbar";

const nav = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/jobs", label: "Projects", icon: Hammer },
  { href: "/portal/approvals", label: "Approvals", icon: FileCheck2 },
  { href: "/portal/documents", label: "Documents", icon: FileText },
];

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
      <div className="mx-auto grid max-w-[1400px] grid-cols-[260px_1fr]">
        <aside className="border-r border-charcoal-800 min-h-[calc(100vh-65px)]">
          <Sidebar items={nav} eyebrow="Your projects" />
        </aside>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
