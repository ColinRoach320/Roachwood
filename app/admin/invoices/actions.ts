"use server";

import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber, roundMoney } from "@/lib/utils";
import { computeLineTotals, parseLineItemsJson } from "@/lib/lineItems";
import type { InvoiceStatus, InvoiceDraw } from "@/lib/types";

const VALID_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

interface ParsedDraw {
  db_id?: string;
  label: string;
  amount: number;
  due_date: string | null;
}

/**
 * Read the JSON `draws` payload that DrawsEditor stuffs into a hidden
 * input. Filters out empty rows.
 */
function parseDrawsJson(raw: FormDataEntryValue | null): ParsedDraw[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (d): d is { db_id?: string; label?: string; amount?: number; due_date?: string | null } =>
          !!d && typeof d === "object",
      )
      .map((d, i) => ({
        db_id: typeof d.db_id === "string" ? d.db_id : undefined,
        label: String(d.label ?? "").trim() || `Draw ${i + 1}`,
        amount: roundMoney(Number(d.amount ?? 0)),
        due_date: d.due_date || null,
      }))
      .filter((d) => d.amount > 0);
  } catch {
    return [];
  }
}

/**
 * Replace the draws on an invoice with the new set, preserving status
 * and amount_paid for any rows the form is keeping by db_id. Service
 * role so the matching trigger fires under one consistent owner.
 *
 * Strategy: delete-then-insert keeps the migration trigger simple and
 * preserves position ordering. For rows the user wants to keep, we
 * re-issue the same id so links + paid timestamps survive.
 */
async function persistDraws(
  invoiceId: string,
  scheduleMode: string,
  rawDraws: FormDataEntryValue | null,
): Promise<void> {
  const admin = createAdminClient();

  if (scheduleMode !== "draws") {
    // Toggled to single payment — wipe any existing draws.
    await admin.from("invoice_draws").delete().eq("invoice_id", invoiceId);
    return;
  }

  const draws = parseDrawsJson(rawDraws);
  if (draws.length === 0) {
    await admin.from("invoice_draws").delete().eq("invoice_id", invoiceId);
    return;
  }

  // Read existing rows so we can preserve status/payment data on rows
  // the form is keeping (matched by db_id).
  const { data: existing } = await admin
    .from("invoice_draws")
    .select("*")
    .eq("invoice_id", invoiceId);
  const existingById = new Map(
    ((existing ?? []) as InvoiceDraw[]).map((d) => [d.id, d]),
  );

  // Wipe and re-insert so position is canonical.
  await admin.from("invoice_draws").delete().eq("invoice_id", invoiceId);

  const rows = draws.map((d, i) => {
    const prior = d.db_id ? existingById.get(d.db_id) : undefined;
    return {
      id: prior?.id, // reuse existing UUID so any external Stripe metadata still resolves
      invoice_id: invoiceId,
      position: i + 1,
      label: d.label,
      amount: d.amount,
      due_date: d.due_date,
      status: prior?.status ?? "pending",
      stripe_payment_link: prior?.stripe_payment_link ?? null,
      stripe_payment_intent_id: prior?.stripe_payment_intent_id ?? null,
      amount_paid: prior?.amount_paid ?? 0,
      paid_at: prior?.paid_at ?? null,
    };
  });

  if (rows.length > 0) {
    await admin.from("invoice_draws").insert(rows as never);
  }
}

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

  await persistDraws(
    data.id,
    String(formData.get("schedule_mode") ?? "single"),
    formData.get("draws"),
  );

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

  await persistDraws(
    id,
    String(formData.get("schedule_mode") ?? "single"),
    formData.get("draws"),
  );

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

/**
 * Flip a draw to sent status. Stripe payment-link generation is a
 * separate explicit action so Colin can mark a draw "sent by check"
 * without creating a Stripe link.
 */
export async function markDrawSent(drawId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: draw, error } = await supabase
    .from("invoice_draws")
    .update({ status: "sent" })
    .eq("id", drawId)
    .select("id, invoice_id")
    .single<{ id: string; invoice_id: string }>();
  if (error || !draw) return fail(error?.message ?? "Could not update draw.");

  const { data: inv } = await supabase
    .from("invoices")
    .select("job_id")
    .eq("id", draw.invoice_id)
    .single<{ job_id: string }>();

  revalidatePath(`/admin/invoices/${draw.invoice_id}`);
  revalidatePath("/admin/invoices");
  if (inv?.job_id) {
    revalidatePath(`/admin/jobs/${inv.job_id}`);
    revalidatePath(`/portal/jobs/${inv.job_id}`);
  }
  revalidatePath("/portal/payments");
  return ok("Draw marked sent.");
}

/**
 * Create (or return the existing) Stripe Payment Link for a single
 * draw. Mirrors /api/stripe/create-payment-link's shape but writes the
 * link onto invoice_draws.stripe_payment_link instead of the parent
 * invoice. metadata.draw_id lets the webhook flip the draw on success.
 */
export async function generateDrawPaymentLink(
  drawId: string,
): Promise<ActionState & { url?: string }> {
  const admin = createAdminClient();

  const { data: draw, error: drawErr } = await admin
    .from("invoice_draws")
    .select("id, invoice_id, label, amount, amount_paid, stripe_payment_link, status")
    .eq("id", drawId)
    .maybeSingle<{
      id: string;
      invoice_id: string;
      label: string;
      amount: number;
      amount_paid: number;
      stripe_payment_link: string | null;
      status: string;
    }>();
  if (drawErr || !draw) return fail(drawErr?.message ?? "Draw not found.");

  if (draw.stripe_payment_link) {
    return { ...ok("Link ready."), url: draw.stripe_payment_link };
  }

  const due = Number(draw.amount ?? 0) - Number(draw.amount_paid ?? 0);
  if (!(due > 0)) return fail("Draw has no balance due.");

  const { data: invoice } = await admin
    .from("invoices")
    .select("title, job_id")
    .eq("id", draw.invoice_id)
    .single<{ title: string; job_id: string }>();
  if (!invoice) return fail("Invoice not found.");

  const product = await stripe.products.create({
    name: `Roachwood — ${invoice.title} · ${draw.label}`,
    metadata: { invoice_id: draw.invoice_id, draw_id: draw.id },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(due * 100),
    currency: "usd",
  });
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoice_id: draw.invoice_id, draw_id: draw.id },
    payment_intent_data: {
      metadata: { invoice_id: draw.invoice_id, draw_id: draw.id },
    },
    after_completion: {
      type: "hosted_confirmation",
      hosted_confirmation: {
        custom_message:
          "Thanks — your payment was received. Roachwood will send a receipt shortly.",
      },
    },
  });

  await admin
    .from("invoice_draws")
    .update({ stripe_payment_link: link.url } as never)
    .eq("id", drawId);

  revalidatePath(`/admin/invoices/${draw.invoice_id}`);
  if (invoice.job_id) revalidatePath(`/portal/jobs/${invoice.job_id}`);
  revalidatePath("/portal/payments");

  return { ...ok("Link ready."), url: link.url };
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
