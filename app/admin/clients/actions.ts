"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";

function readClientForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    contact_name: get("contact_name"),
    company_name: get("company_name") || null,
    email: get("email") || null,
    phone: get("phone") || null,
    address: get("address") || null,
    notes: get("notes") || null,
  };
}

function validateClient(input: ReturnType<typeof readClientForm>) {
  const errors: Record<string, string> = {};
  if (!input.contact_name) errors.contact_name = "Contact name is required.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

export async function createClientRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readClientForm(formData);
  const errors = validateClient(input);
  if (Object.keys(errors).length > 0) {
    return { ...fail("Please fix the highlighted fields.", errors) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(input)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return fail(error?.message ?? "Could not save client.");
  }

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return ok("Client created.", `/admin/clients/${data.id}`);
}

export async function updateClientRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readClientForm(formData);
  const errors = validateClient(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return ok("Client updated.", `/admin/clients/${id}`);
}

export async function deleteClientRecord(
  id: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/clients");
  return ok("Client deleted.", "/admin/clients");
}
