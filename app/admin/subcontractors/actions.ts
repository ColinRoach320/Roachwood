"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import type { SubcontractorTrade, SubcontractorRateType } from "@/lib/types";

const VALID_TRADES: SubcontractorTrade[] = [
  "electrical",
  "plumbing",
  "hvac",
  "framing",
  "drywall",
  "painting",
  "flooring",
  "roofing",
  "concrete",
  "landscaping",
  "cleaning",
  "other",
];

const VALID_RATE_TYPES: SubcontractorRateType[] = [
  "hourly",
  "daily",
  "project",
];

function readSubForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const trade = get("trade") as SubcontractorTrade;
  const rateType = get("rate_type") as SubcontractorRateType;
  return {
    contact_name: get("contact_name"),
    company_name: get("company_name") || null,
    email: get("email") || null,
    phone: get("phone") || null,
    trade: VALID_TRADES.includes(trade) ? trade : null,
    rate_type: VALID_RATE_TYPES.includes(rateType) ? rateType : null,
    rate: get("rate") ? parseNumber(get("rate")) : null,
    tax_id: get("tax_id") || null,
    w9_on_file: formData.get("w9_on_file") === "on",
    notes: get("notes") || null,
  };
}

function validateSub(input: ReturnType<typeof readSubForm>) {
  const errors: Record<string, string> = {};
  if (!input.contact_name) errors.contact_name = "Contact name is required.";
  if (!input.trade) errors.trade = "Pick a trade.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

export async function createSubcontractor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readSubForm(formData);
  const errors = validateSub(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subcontractors")
    .insert(input as never)
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not save subcontractor.");

  revalidatePath("/admin/subcontractors");
  return ok("Subcontractor saved.", `/admin/subcontractors/${data.id}`);
}

export async function updateSubcontractor(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readSubForm(formData);
  const errors = validateSub(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("subcontractors")
    .update(input as never)
    .eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/subcontractors");
  revalidatePath(`/admin/subcontractors/${id}`);
  return ok("Subcontractor updated.", `/admin/subcontractors/${id}`);
}

export async function deleteSubcontractor(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("subcontractors").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/subcontractors");
  return ok("Subcontractor removed.", "/admin/subcontractors");
}

function readPaymentForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    job_id: get("job_id") || null,
    amount: parseNumber(formData.get("amount")),
    date: get("date") || new Date().toISOString().slice(0, 10),
    description: get("description") || null,
  };
}

export async function recordSubcontractorPayment(
  subcontractorId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readPaymentForm(formData);
  const errors: Record<string, string> = {};
  if (!(input.amount > 0)) errors.amount = "Amount must be positive.";
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("subcontractor_payments").insert({
    subcontractor_id: subcontractorId,
    job_id: input.job_id,
    amount: input.amount,
    date: input.date,
    description: input.description,
  } as never);
  if (error) return fail(error.message);

  revalidatePath(`/admin/subcontractors/${subcontractorId}`);
  return ok("Payment logged.");
}
