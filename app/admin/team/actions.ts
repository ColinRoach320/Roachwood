"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";

const ALLOWED_ROLES = ["super_admin", "admin", "staff"] as const;
type TeamRole = (typeof ALLOWED_ROLES)[number];

async function requireSuperAdmin(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  return { ok: profile?.role === "super_admin" };
}

function readInviteForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const role = get("role") as TeamRole;
  return {
    email: get("email").toLowerCase(),
    full_name: get("full_name") || null,
    role: ALLOWED_ROLES.includes(role) ? role : ("staff" as TeamRole),
  };
}

export async function inviteTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail("Only super admins can invite team members.");

  const input = readInviteForm(formData);
  const errors: Record<string, string> = {};
  if (!input.email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(input.email);
  if (inviteErr || !invited?.user) {
    return fail(inviteErr?.message ?? "Could not send invite.");
  }

  // The on_auth_user_created trigger will have inserted a profile row
  // with role='client'. Promote to the chosen team role.
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      role: input.role,
      full_name: input.full_name,
      email: input.email,
    })
    .eq("id", invited.user.id);
  if (updateErr) return fail(updateErr.message);

  revalidatePath("/admin/team");
  return ok(`Invite sent to ${input.email}.`);
}

export async function updateTeamMemberRole(
  userId: string,
  role: string,
): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail("Only super admins can change roles.");
  if (!ALLOWED_ROLES.includes(role as TeamRole)) {
    return fail("Invalid role.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return fail(error.message);

  revalidatePath("/admin/team");
  return ok("Role updated.");
}

export async function removeTeamMember(
  userId: string,
): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail("Only super admins can remove members.");

  // Block removing yourself — easy to lock the account out.
  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();
  if (me?.id === userId) return fail("You can't remove your own account.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return fail(error.message);

  revalidatePath("/admin/team");
  return ok("Member removed.");
}
