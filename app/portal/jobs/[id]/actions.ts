"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function decideChangeOrder(formData: FormData) {
  const changeOrderId = String(formData.get("change_order_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const jobId = String(formData.get("job_id") ?? "");

  if (decision !== "approved" && decision !== "declined") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS gates this update — only the owning client can flip a sent
  // change order to approved/declined. The DB trigger then bumps (or
  // un-bumps) jobs.estimated_value by the change order's total.
  const patch: Record<string, unknown> = { status: decision };
  if (decision === "approved") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = user.id;
    patch.declined_at = null;
  } else {
    patch.declined_at = new Date().toISOString();
    patch.approved_at = null;
  }

  await supabase
    .from("change_orders")
    .update(patch as never)
    .eq("id", changeOrderId);

  revalidatePath(`/portal/jobs/${jobId}`);
  revalidatePath("/portal");
}

export async function decideApproval(formData: FormData) {
  const approvalId = String(formData.get("approval_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const jobId = String(formData.get("job_id") ?? "");

  if (decision !== "approved" && decision !== "rejected") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS allows clients to update their own pending approvals to approved/rejected.
  await supabase
    .from("approvals")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  revalidatePath(`/portal/jobs/${jobId}`);
  revalidatePath("/portal");
}
