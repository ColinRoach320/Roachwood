"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

const VALID_CATEGORIES: ExpenseCategory[] = [
  "materials",
  "labor",
  "subcontractor",
  "equipment",
  "other",
];

function readExpenseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const cat = get("category") as ExpenseCategory;
  return {
    job_id: get("job_id"),
    vendor: get("vendor") || null,
    category: VALID_CATEGORIES.includes(cat) ? cat : null,
    amount: parseNumber(formData.get("amount")),
    date: get("date") || new Date().toISOString().slice(0, 10),
    notes: get("notes") || null,
  };
}

function validateExpense(input: ReturnType<typeof readExpenseForm>) {
  const errors: Record<string, string> = {};
  if (!input.job_id) errors.job_id = "Pick a job.";
  if (!(input.amount > 0)) errors.amount = "Amount must be positive.";
  return errors;
}

export async function createExpenseRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readExpenseForm(formData);
  const errors = validateExpense(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert(input)
    .select("id, job_id")
    .single<{ id: string; job_id: string }>();
  if (error || !data) return fail(error?.message ?? "Could not save expense.");

  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/jobs/${data.job_id}`);
  return ok("Expense logged.", `/admin/expenses`);
}

export async function updateExpenseRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readExpenseForm(formData);
  const errors = validateExpense(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(input).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/expenses/${id}`);
  revalidatePath(`/admin/jobs/${input.job_id}`);
  return ok("Expense updated.", `/admin/expenses`);
}

export async function deleteExpenseRecord(
  id: string,
  jobId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/jobs/${jobId}`);
  return ok("Expense deleted.", "/admin/expenses");
}
