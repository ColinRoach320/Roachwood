"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import { computeLineTotals, parseLineItemsJson } from "@/lib/lineItems";
import type { EstimateStatus } from "@/lib/types";

const VALID_STATUSES: EstimateStatus[] = ["draft", "sent", "approved", "declined"];

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

function validateEstimate(input: ReturnType<typeof readEstimateForm>) {
  const errors: Record<string, string> = {};
  if (!input.job_id) errors.job_id = "Pick a job.";
  if (!input.title) errors.title = "Title is required.";
  if (input.line_items.length === 0) {
    errors.line_items = "Add at least one line.";
  }
  return errors;
}

export async function createEstimateRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readEstimateForm(formData);
  const errors = validateEstimate(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .insert(input)
    .select("id, job_id")
    .single<{ id: string; job_id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not save estimate.");

  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/jobs/${data.job_id}`);
  return ok("Estimate created.", `/admin/estimates/${data.id}`);
}

export async function updateEstimateRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readEstimateForm(formData);
  const errors = validateEstimate(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("estimates").update(input).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/estimates/${id}`);
  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/jobs/${input.job_id}`);
  return ok("Estimate updated.", `/admin/estimates/${id}`);
}

/**
 * Status transition. Used by the detail page Send / Approve / Decline
 * buttons. Wrapped as a `(formData) => void` action so it can be passed
 * directly to `<form action={...}>` after .bind(null, id, status).
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
  revalidatePath(`/admin/estimates/${id}`);
  revalidatePath("/admin/estimates");
  if (data?.job_id) revalidatePath(`/admin/jobs/${data.job_id}`);
}
