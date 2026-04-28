"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import { computeLineTotals, parseLineItemsJson } from "@/lib/lineItems";
import type { ChangeOrderStatus } from "@/lib/types";

const VALID_STATUSES: ChangeOrderStatus[] = [
  "draft",
  "sent",
  "approved",
  "declined",
];

function readChangeOrderForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const items = parseLineItemsJson(formData.get("line_items"));
  const taxRate = parseNumber(formData.get("tax_rate"));
  const { items: normalized, totals } = computeLineTotals(items, taxRate);
  const statusRaw = get("status") as ChangeOrderStatus;
  return {
    job_id: get("job_id"),
    title: get("title"),
    description: get("description") || null,
    notes: get("notes") || null,
    status: VALID_STATUSES.includes(statusRaw) ? statusRaw : "draft",
    tax_rate: taxRate,
    line_items: normalized,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
  };
}

export async function createChangeOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readChangeOrderForm(formData);
  const fieldErrors: Record<string, string> = {};
  if (!input.job_id) fieldErrors.job_id = "Pick a job.";
  if (!input.title) fieldErrors.title = "Title is required.";
  if (input.line_items.length === 0) {
    fieldErrors.line_items = "Add at least one line.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_orders")
    .insert(input as never)
    .select("id, job_id")
    .single<{ id: string; job_id: string }>();
  if (error || !data) {
    return fail(error?.message ?? "Could not save change order.");
  }

  revalidatePath(`/admin/jobs/${data.job_id}`);
  revalidatePath("/admin");
  return ok("Change order saved.", `/admin/change-orders/${data.id}`);
}

export async function updateChangeOrder(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readChangeOrderForm(formData);
  const fieldErrors: Record<string, string> = {};
  if (!input.title) fieldErrors.title = "Title is required.";
  if (input.line_items.length === 0) {
    fieldErrors.line_items = "Add at least one line.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("change_orders")
    .update({
      title: input.title,
      description: input.description,
      notes: input.notes,
      status: input.status,
      tax_rate: input.tax_rate,
      line_items: input.line_items,
      subtotal: input.subtotal,
      tax_amount: input.tax_amount,
      total: input.total,
    } as never)
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/change-orders/${id}`);
  revalidatePath(`/admin/jobs/${input.job_id}`);
  return ok("Change order updated.", `/admin/change-orders/${id}`);
}

/**
 * Status transition. The DB trigger handles the job-value cascade on
 * approve / un-approve, so this just writes the new status (plus
 * approved_at / declined_at stamps).
 */
export async function setChangeOrderStatus(
  id: string,
  status: ChangeOrderStatus,
): Promise<ActionState> {
  if (!VALID_STATUSES.includes(status)) return fail("Invalid status.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patch: Record<string, unknown> = { status };
  if (status === "approved") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = user?.id ?? null;
    patch.declined_at = null;
  } else if (status === "declined") {
    patch.declined_at = new Date().toISOString();
    patch.approved_at = null;
  } else {
    patch.approved_at = null;
    patch.declined_at = null;
  }

  const { data, error } = await supabase
    .from("change_orders")
    .update(patch as never)
    .eq("id", id)
    .select("job_id")
    .single<{ job_id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not update status.");

  revalidatePath(`/admin/change-orders/${id}`);
  revalidatePath(`/admin/jobs/${data.job_id}`);
  revalidatePath(`/portal/jobs/${data.job_id}`);
  revalidatePath("/admin");
  return ok("Status updated.");
}

/**
 * Void wrapper around setChangeOrderStatus so a `<form action={...}>`
 * can call it via `.bind(null, id, status)` — same shape as
 * setEstimateStatus. Errors are swallowed; the page revalidates and
 * the user sees the new state on next render.
 */
export async function setChangeOrderStatusVoid(
  id: string,
  status: ChangeOrderStatus,
): Promise<void> {
  await setChangeOrderStatus(id, status);
}

export async function deleteChangeOrder(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("change_orders")
    .select("job_id")
    .eq("id", id)
    .single<{ job_id: string }>();
  const { error } = await supabase.from("change_orders").delete().eq("id", id);
  if (error) return fail(error.message);
  if (existing) revalidatePath(`/admin/jobs/${existing.job_id}`);
  return ok("Change order deleted.", "/admin");
}
