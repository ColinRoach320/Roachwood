"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import { computeLineTotals, parseLineItemsJson } from "@/lib/lineItems";
import type { EstimateStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const VALID_STATUSES: EstimateStatus[] = [
  "draft",
  "sent",
  "won",
  "lost",
  "no_response",
];

const NEW_CLIENT = "__new_client__";
const NEW_JOB = "__new_job__";

function readEstimateForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const items = parseLineItemsJson(formData.get("line_items"));
  const taxRate = parseNumber(formData.get("tax_rate"));
  const { items: normalized, totals } = computeLineTotals(items, taxRate);
  const statusRaw = get("status") as EstimateStatus;
  return {
    job_id: get("job_id"),
    client_id: get("client_id"),
    title: get("title"),
    notes: get("notes") || null,
    status: VALID_STATUSES.includes(statusRaw) ? statusRaw : "draft",
    tax_rate: taxRate,
    line_items: normalized,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
  };
}

/**
 * Estimate-first cascade: when the form was submitted with the
 * `__new_client__` and/or `__new_job__` sentinels, create those rows
 * first so the estimate insert has a real client_id / job_id to point
 * at. Resulting in three rows persisted from one submit. The client +
 * project stick around even if the estimate ends up lost — that's the
 * point.
 */
async function resolveClientAndJob(
  formData: FormData,
  estimateTitle: string,
  rawClientId: string,
  rawJobId: string,
  supabase: SupabaseServerClient,
): Promise<
  | { ok: true; client_id: string | null; job_id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  let clientId: string | null = null;

  // 1. Resolve the client. If "+ New client" was picked, create it
  //    using the inline contact panel; otherwise we'll derive
  //    client_id from the existing job.
  if (rawClientId === NEW_CLIENT) {
    // Address arrives as four split fields (street/city/state/zip)
    // from the new form. Older form versions sent a single
    // `new_client_address`; honor that as a fallback.
    const street = get("new_client_street");
    const city = get("new_client_city");
    const state = get("new_client_state");
    const zip = get("new_client_zip");
    const splitAddress = [street, [city, state].filter(Boolean).join(", "), zip]
      .filter(Boolean)
      .join(" ")
      .trim();
    const address = splitAddress || get("new_client_address") || null;

    const newClient = {
      contact_name: get("new_client_name"),
      email: get("new_client_email") || null,
      phone: get("new_client_phone") || null,
      address,
    };
    const errors: Record<string, string> = {};
    if (!newClient.contact_name) {
      errors.new_client_name = "Contact name is required.";
    }
    if (
      newClient.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email)
    ) {
      errors.new_client_email = "Enter a valid email.";
    }
    if (Object.keys(errors).length > 0) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: errors,
      };
    }

    const { data, error } = await supabase
      .from("clients")
      .insert(newClient)
      .select("id")
      .single<{ id: string }>();
    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not create client.",
      };
    }
    clientId = data.id;
  } else if (rawClientId !== "") {
    clientId = rawClientId;
  }

  // 2. Resolve the project. "+ New project" → insert a fresh job in
  //    "lead" status. Existing job → use as-is.
  //
  // Special case: when the user just created a brand-new client, a
  // missing job_id always implies "+ New project" — a brand-new client
  // can't have an existing project to attach to. Treat the empty
  // submission as NEW_JOB instead of erroring out, which used to leave
  // the new client orphaned without an estimate.
  const wantsNewJob =
    rawJobId === NEW_JOB || (rawClientId === NEW_CLIENT && rawJobId === "");

  if (wantsNewJob) {
    if (!clientId) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: { client_id: "Pick a client before creating a project." },
      };
    }

    const newJob = {
      client_id: clientId,
      title: get("new_job_title") || estimateTitle,
      address: get("new_job_address") || null,
      status: "lead" as const,
    };
    const { data, error } = await supabase
      .from("jobs")
      .insert(newJob)
      .select("id, client_id")
      .single<{ id: string; client_id: string }>();
    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not create project.",
      };
    }
    // Confirm the link survived the insert before continuing — if a
    // future trigger ever stripped client_id, we'd rather fail loudly
    // than save an estimate against a detached project.
    if (data.client_id !== clientId) {
      return {
        ok: false,
        error: "New project saved without a client link. Please retry.",
      };
    }
    return { ok: true, client_id: clientId, job_id: data.id };
  }

  if (!rawJobId) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { job_id: "Pick a project." },
    };
  }
  return { ok: true, client_id: clientId, job_id: rawJobId };
}

export async function createEstimateRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readEstimateForm(formData);

  // Validate line items first; title is now derived from the project
  // name when blank (the form on /admin/estimates/new doesn't surface
  // a separate title input — the project name doubles as the title).
  const fieldErrors: Record<string, string> = {};
  if (input.line_items.length === 0) {
    fieldErrors.line_items = "Add at least one line.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const newJobTitleHint =
    typeof formData.get("new_job_title") === "string"
      ? String(formData.get("new_job_title")).trim()
      : "";
  const resolved = await resolveClientAndJob(
    formData,
    input.title || newJobTitleHint || "Estimate",
    input.client_id,
    input.job_id,
    supabase,
  );
  if (!resolved.ok) return fail(resolved.error, resolved.fieldErrors);

  // Derive the final estimate title. Order: explicit title from form
  // (edit screen) → new_job_title (cascade) → resolved job's title.
  let finalTitle = input.title;
  if (!finalTitle) finalTitle = newJobTitleHint;
  if (!finalTitle) {
    const { data: job } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", resolved.job_id)
      .maybeSingle<{ title: string }>();
    finalTitle = job?.title ?? "Estimate";
  }

  const insertPayload = {
    job_id: resolved.job_id,
    title: finalTitle,
    notes: input.notes,
    status: input.status,
    tax_rate: input.tax_rate,
    line_items: input.line_items,
    subtotal: input.subtotal,
    tax_amount: input.tax_amount,
    total: input.total,
  };

  const { data, error } = await supabase
    .from("estimates")
    .insert(insertPayload)
    .select("id, job_id")
    .single<{ id: string; job_id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not save estimate.");

  // If the brand-new estimate is already marked won, propagate to the
  // job so it lines up with how setEstimateStatus would behave for a
  // later transition.
  if (input.status === "won") {
    await supabase
      .from("jobs")
      .update({ status: "active" })
      .eq("id", data.job_id);
  }

  revalidatePath("/admin/estimates");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  revalidatePath(`/admin/jobs/${data.job_id}`);
  return ok("Estimate saved.", `/admin/estimates/${data.id}`);
}

export async function updateEstimateRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readEstimateForm(formData);
  const fieldErrors: Record<string, string> = {};
  if (!input.job_id) fieldErrors.job_id = "Pick a project.";
  if (input.line_items.length === 0) {
    fieldErrors.line_items = "Add at least one line.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  // Same fallback as create: blank description → use project name.
  let finalTitle = input.title;
  if (!finalTitle) {
    const { data: job } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", input.job_id)
      .maybeSingle<{ title: string }>();
    finalTitle = job?.title ?? "Estimate";
  }

  const updatePayload = {
    job_id: input.job_id,
    title: finalTitle,
    notes: input.notes,
    status: input.status,
    tax_rate: input.tax_rate,
    line_items: input.line_items,
    subtotal: input.subtotal,
    tax_amount: input.tax_amount,
    total: input.total,
  };
  const { error } = await supabase
    .from("estimates")
    .update(updatePayload)
    .eq("id", id);
  if (error) return fail(error.message);

  if (input.status === "won") {
    await supabase
      .from("jobs")
      .update({ status: "active" })
      .eq("id", input.job_id);
  }

  revalidatePath(`/admin/estimates/${id}`);
  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/jobs/${input.job_id}`);
  return ok("Estimate updated.", `/admin/estimates/${id}`);
}

/**
 * Status transition. Wrapped as a `(formData) => void` action so it can
 * be passed directly to `<form action={...}>` after .bind(null, id, status).
 *
 * "won" cascades: job → "active". "lost" / "no_response" leave the job
 * alone (the brief is explicit — the client + project stick around for
 * future marketing).
 */
export async function setEstimateStatus(
  id: string,
  status: EstimateStatus,
): Promise<void> {
  if (!VALID_STATUSES.includes(status)) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("estimates")
    .update({ status })
    .eq("id", id)
    .select("job_id")
    .single<{ job_id: string }>();

  if (status === "won" && data?.job_id) {
    await supabase
      .from("jobs")
      .update({ status: "active" })
      .eq("id", data.job_id);
  }

  revalidatePath(`/admin/estimates/${id}`);
  revalidatePath("/admin/estimates");
  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  if (data?.job_id) {
    revalidatePath(`/admin/jobs/${data.job_id}`);
    revalidatePath(`/portal/jobs/${data.job_id}`);
  }
}
