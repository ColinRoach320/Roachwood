"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";

function readForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    phone: get("phone") || null,
    email: get("email") || null,
    service_area: get("service_area") || null,
    tagline: get("tagline") || null,
    google_review_url: get("google_review_url") || null,
    houzz_url: get("houzz_url") || null,
    instagram_url: get("instagram_url") || null,
  };
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

export async function updateSiteSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readForm(formData);
  const errors: Record<string, string> = {};

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Invalid email.";
  }
  for (const [field, val] of [
    ["google_review_url", input.google_review_url],
    ["houzz_url", input.houzz_url],
    ["instagram_url", input.instagram_url],
  ] as const) {
    if (val && !URL_RE.test(val)) {
      errors[field] = "Must start with http:// or https://";
    }
  }
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update(input)
    .eq("id", 1);
  if (error) return fail(error.message);

  revalidatePath("/admin/content/settings");
  revalidatePath("/", "layout");
  return ok("Site settings saved.");
}
