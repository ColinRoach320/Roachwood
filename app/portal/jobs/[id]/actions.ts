"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
