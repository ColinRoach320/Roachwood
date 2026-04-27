"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const VALID_STATUSES: JobStatus[] = [
  "quoted",
  "approved",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

/**
 * Sentinel emitted by the JobForm client when the user picked
 * "+ New client" from the dropdown. The action then reads the inline
 * fields, creates the client, and substitutes the real id before
 * inserting the job.
 */
const NEW_CLIENT_SENTINEL = "__new__";

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

/**
 * If the dropdown submitted the "+ New client" sentinel, validate +
 * insert the inline client and return its id. Otherwise return the
 * existing id unchanged.
 */
async function resolveClientId(
  clientId: string,
  formData: FormData,
  supabase: SupabaseServerClient,
): Promise<
  | { ok: true; client_id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  if (clientId !== NEW_CLIENT_SENTINEL) {
    return { ok: true, client_id: clientId };
  }

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const newClient = {
    contact_name: get("new_client_name"),
    email: get("new_client_email") || null,
    phone: get("new_client_phone") || null,
  };

  const fieldErrors: Record<string, string> = {};
  if (!newClient.contact_name) {
    fieldErrors.new_client_name = "Contact name is required.";
  }
  if (
    newClient.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email)
  ) {
    fieldErrors.new_client_email = "Enter a valid email.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(newClient)
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create client." };
  }
  return { ok: true, client_id: data.id };
}

export async function createJobRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readJobForm(formData);

  // Title is the only field that's required regardless of which client
  // path we're on. Defer the client_id check to after resolveClientId so
  // a "+ New client" submission isn't rejected for an empty client_id.
  const fieldErrors: Record<string, string> = {};
  if (!input.title) fieldErrors.title = "Title is required.";
  if (input.estimated_value != null && input.estimated_value < 0) {
    fieldErrors.estimated_value = "Value can't be negative.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const resolved = await resolveClientId(input.client_id, formData, supabase);
  if (!resolved.ok) {
    return fail(resolved.error, resolved.fieldErrors);
  }
  if (!resolved.client_id) {
    return fail("Please fix the highlighted fields.", {
      client_id: "Pick a client.",
    });
  }
  input.client_id = resolved.client_id;

  const { data, error } = await supabase
    .from("jobs")
    .insert(input)
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not create job.");

  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${input.client_id}`);
  return ok("Job created.", `/admin/jobs/${data.id}`);
}

export async function updateJobRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readJobForm(formData);

  const fieldErrors: Record<string, string> = {};
  if (!input.title) fieldErrors.title = "Title is required.";
  if (input.estimated_value != null && input.estimated_value < 0) {
    fieldErrors.estimated_value = "Value can't be negative.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const resolved = await resolveClientId(input.client_id, formData, supabase);
  if (!resolved.ok) {
    return fail(resolved.error, resolved.fieldErrors);
  }
  if (!resolved.client_id) {
    return fail("Please fix the highlighted fields.", {
      client_id: "Pick a client.",
    });
  }
  input.client_id = resolved.client_id;

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
