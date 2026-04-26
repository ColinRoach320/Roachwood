"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import { computeLineTotals, parseLineItemsJson } from "@/lib/lineItems";
import type { InvoiceStatus } from "@/lib/types";

const VALID_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

function readInvoiceForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const items = parseLineItemsJson(formData.get("line_items"));
  const taxRate = parseNumber(formData.get("tax_rate"));
  const { items: normalized, totals } = computeLineTotals(items, taxRate);
  const statusRaw = get("status") as InvoiceStatus;
  return {
    job_id: get("job_id"),
    estimate_id: get("estimate_id") || null,
    title: get("title"),
    notes: get("notes") || null,
    due_date: get("due_date") || null,
    status: VALID_STATUSES.includes(statusRaw) ? statusRaw : "draft",
    tax_rate: taxRate,
    line_items: normalized,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    amount_paid: parseNumber(formData.get("amount_paid")),
  };
}

function validateInvoice(input: ReturnType<typeof readInvoiceForm>) {
  const errors: Record<string, string> = {};
  if (!input.job_id) errors.job_id = "Pick a job.";
  if (!input.title) errors.title = "Title is required.";
  if (input.line_items.length === 0) {
    errors.line_items = "Add at least one line.";
  }
  if (input.amount_paid < 0) {
    errors.amount_paid = "Amount paid can't be negative.";
  }
  return errors;
}

export async function createInvoiceRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readInvoiceForm(formData);
  const errors = validateInvoice(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert(input)
    .select("id, job_id")
    .single<{ id: string; job_id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not save invoice.");

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/jobs/${data.job_id}`);
  return ok("Invoice created.", `/admin/invoices/${data.id}`);
}

export async function updateInvoiceRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readInvoiceForm(formData);
  const errors = validateInvoice(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const update: typeof input & { paid_at?: string | null } = { ...input };
  // When the invoice flips to paid, stamp paid_at; when it flips off paid,
  // clear it. Simpler than tracking the previous status here.
  if (input.status === "paid") {
    update.paid_at = new Date().toISOString();
  } else {
    update.paid_at = null;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update(update).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/jobs/${input.job_id}`);
  return ok("Invoice updated.", `/admin/invoices/${id}`);
}

/**
 * Status transition wrapper for the invoice detail page buttons. Returns
 * void so it can drop straight into `<form action={...}>` after
 * .bind(null, id, status).
 */
export async function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<void> {
  if (!VALID_STATUSES.includes(status)) return;
  const supabase = await createClient();
  const patch: { status: InvoiceStatus; paid_at: string | null } = {
    status,
    paid_at: status === "paid" ? new Date().toISOString() : null,
  };
  const { data } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select("job_id")
    .single<{ job_id: string }>();

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  if (data?.job_id) revalidatePath(`/admin/jobs/${data.job_id}`);
}

export async function recordInvoicePayment(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const amount = parseNumber(formData.get("amount"));
  if (amount <= 0) return fail("Enter a positive amount.");

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("invoices")
    .select("amount_paid, total, job_id")
    .eq("id", id)
    .single<{ amount_paid: number; total: number; job_id: string }>();
  if (readErr || !existing) return fail(readErr?.message ?? "Invoice not found.");

  const nextPaid = Number(existing.amount_paid ?? 0) + amount;
  const fullyPaid = nextPaid >= Number(existing.total ?? 0) - 0.005;

  const { error } = await supabase
    .from("invoices")
    .update({
      amount_paid: nextPaid,
      status: fullyPaid ? "paid" : undefined,
      paid_at: fullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/jobs/${existing.job_id}`);
  return ok(fullyPaid ? "Payment recorded — invoice paid in full." : "Payment recorded.");
}
