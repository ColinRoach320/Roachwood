import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { InviteTeamMemberForm } from "@/components/admin/InviteTeamMemberForm";
import { TeamRowActions } from "@/components/admin/TeamRowActions";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { inviteTeamMember } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
};

const ROLE_TONE: Record<string, string> = {
  super_admin:
    "bg-gold-500/15 border-gold-500/40 text-gold-300",
  admin:
    "bg-blue-500/15 border-blue-500/40 text-blue-300",
  staff:
    "bg-charcoal-700/60 border-charcoal-600 text-charcoal-200",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/team");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (me?.role !== "super_admin") redirect("/admin");

  // Service role joins profile + auth.users for email/last_sign_in.
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, email, created_at")
    .in("role", ["super_admin", "admin", "staff"])
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Team</p>
        <h1 className="rw-display mt-2 text-3xl">Team management</h1>
        <p className="mt-2 max-w-2xl text-sm text-charcoal-400">
          Invite staff and admins, change their role, or remove them. Only
          super admins see this page. Staff have read-only access (gating
          per-page is a follow-up; today the role exists in the schema).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Invite a team member</CardTitle>
            <CardDescription>
              Sends an invite email via Supabase. They&apos;ll set their own
              password the first time they sign in.
            </CardDescription>
          </div>
        </CardHeader>
        <InviteTeamMemberForm action={inviteTeamMember} />
      </Card>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {(profiles ?? []).length} active team member
              {(profiles ?? []).length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Added</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(profiles ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-charcoal-400"
                >
                  No team members yet.
                </td>
              </tr>
            ) : (
              profiles!.map((p) => {
                const isSelf = p.id === user.id;
                const tone = ROLE_TONE[p.role] ?? ROLE_TONE.staff;
                return (
                  <tr key={p.id} className="hover:bg-charcoal-700/30">
                    <td className="px-6 py-3 text-charcoal-100">
                      {p.full_name ?? "—"}
                      {isSelf ? (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                          you
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {p.email ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${tone}`}
                      >
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-charcoal-400">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <TeamRowActions
                        userId={p.id}
                        currentRole={p.role}
                        displayName={p.full_name ?? p.email ?? "this member"}
                        isSelf={isSelf}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
