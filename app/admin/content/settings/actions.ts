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
  };
}

export async function updateSiteSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readForm(formData);

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return fail("Enter a valid email.", { email: "Invalid email." });
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
