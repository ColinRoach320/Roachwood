import { createClient } from "@/lib/supabase/server";

/**
 * Verify the request comes from a signed-in admin. Used by the PDF
 * route handlers — they fetch with the service role, but we still
 * require an admin session so the URLs aren't world-readable.
 */
export async function requireAdmin(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  return { ok: profile?.role === "admin" };
}
