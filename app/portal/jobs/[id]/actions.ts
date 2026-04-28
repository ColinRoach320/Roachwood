"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Client decision on an estimate from the portal. Mirrors
 * decideChangeOrder. Status mapping:
 *   approved → "won"   (cascades job → "active")
 *   declined → "lost"
 *
 * The estimate update runs under the client's session via the new
 * `estimates client decide` RLS policy. The job-status cascade then
 * runs with service role since clients can't update jobs directly.
 */
export async function decideEstimate(formData: FormData) {
  const estimateId = String(formData.get("estimate_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const jobId = String(formData.get("job_id") ?? "");

  if (decision !== "approved" && decision !== "declined") return;
  const nextStatus = decision === "approved" ? "won" : "lost";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("estimates")
    .update({ status: nextStatus } as never)
    .eq("id", estimateId);
  if (error) return;

  if (nextStatus === "won") {
    // Service-role flip on jobs since clients don't have UPDATE on
    // jobs. Same cascade the admin setEstimateStatus uses.
    const admin = createAdminClient();
    await admin.from("jobs").update({ status: "active" } as never).eq("id", jobId);
  }

  revalidatePath(`/portal/jobs/${jobId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/approvals");
}

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
