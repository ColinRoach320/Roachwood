"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";

export async function sendMessage(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return fail("Type a message before sending.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Not signed in.");

  const { error } = await supabase.from("messages").insert({
    job_id: jobId,
    sender_id: user.id,
    body,
  });
  if (error) return fail(error.message);

  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath(`/portal/jobs/${jobId}`);
  return ok("Sent.");
}
