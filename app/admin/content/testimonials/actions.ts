"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";

function readForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const ratingRaw = Number(get("star_rating") || 5);
  const sortRaw = Number(get("sort_order") || 0);
  return {
    client_name: get("client_name"),
    location: get("location") || null,
    quote: get("quote"),
    star_rating: Math.max(1, Math.min(5, Number.isFinite(ratingRaw) ? ratingRaw : 5)),
    project_type: get("project_type") || null,
    visible: formData.get("visible") === "on",
    sort_order: Number.isFinite(sortRaw) ? sortRaw : 0,
  };
}

function validate(input: ReturnType<typeof readForm>) {
  const errors: Record<string, string> = {};
  if (!input.client_name) errors.client_name = "Client name is required.";
  if (!input.quote) errors.quote = "Quote is required.";
  return errors;
}

function bust() {
  revalidatePath("/admin/content/testimonials");
  revalidatePath("/", "layout"); // marketing page renders these
}

export async function createTestimonial(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readForm(formData);
  const errors = validate(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").insert(input);
  if (error) return fail(error.message);
  bust();
  return ok("Testimonial created.", "/admin/content/testimonials");
}

export async function updateTestimonial(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readForm(formData);
  const errors = validate(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("testimonials")
    .update(input)
    .eq("id", id);
  if (error) return fail(error.message);
  bust();
  return ok("Testimonial updated.", "/admin/content/testimonials");
}

export async function toggleTestimonialVisibility(
  id: string,
  current: boolean,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("testimonials")
    .update({ visible: !current })
    .eq("id", id);
  bust();
}

export async function deleteTestimonial(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id);
  bust();
}
