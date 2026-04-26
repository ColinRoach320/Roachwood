"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

const VALID_STATUSES: JobStatus[] = [
  "quoted",
  "approved",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

function readJobForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const statusRaw = get("status") as JobStatus;
  return {
    client_id: get("client_id"),
    title: get("title"),
    description: get("description") || null,
    status: VALID_STATUSES.includes(statusRaw) ? statusRaw : "quoted",
    address: get("address") || null,
    start_date: get("start_date") || null,
    end_date: get("end_date") || null,
    estimated_value: get("estimated_value")
      ? parseNumber(get("estimated_value"))
      : null,
  };
}

function validateJob(input: ReturnType<typeof readJobForm>) {
  const errors: Record<string, string> = {};
  if (!input.client_id) errors.client_id = "Pick a client.";
  if (!input.title) errors.title = "Title is required.";
  if (input.estimated_value != null && input.estimated_value < 0) {
    errors.estimated_value = "Value can't be negative.";
  }
  return errors;
}

export async function createJobRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readJobForm(formData);
  const errors = validateJob(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert(input)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return fail(error?.message ?? "Could not create job.");

  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${input.client_id}`);
  return ok("Job created.", `/admin/jobs/${data.id}`);
}

export async function updateJobRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readJobForm(formData);
  const errors = validateJob(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update(input).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/jobs/${id}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  return ok("Job updated.", `/admin/jobs/${id}`);
}

export async function addJobUpdate(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const body = String(formData.get("body") ?? "").trim();
  const visible = formData.get("visible_to_client") === "on";
  if (!body) {
    return fail("Add a note before posting.", { body: "Required." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("job_updates").insert({
    job_id: jobId,
    body,
    visible_to_client: visible,
    author_id: user?.id ?? null,
  });
  if (error) return fail(error.message);

  revalidatePath(`/admin/jobs/${jobId}`);
  return ok("Update posted.");
}
