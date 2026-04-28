import "server-only";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

interface ProfileLite {
  id: string;
  email: string | null;
  full_name: string | null;
  stripe_customer_id: string | null;
}

/**
 * Find-or-create the Stripe customer for a profile. Persists the
 * customer id back to the profile on first creation so subsequent
 * page loads skip the round-trip. Uses the service-role client so
 * the write succeeds regardless of the caller's RLS context.
 *
 * Returns null if STRIPE_SECRET_KEY isn't configured — callers should
 * surface "payments not configured" rather than throwing.
 */
export async function ensureStripeCustomer(
  profile: ProfileLite,
): Promise<string | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  if (profile.stripe_customer_id) {
    return profile.stripe_customer_id;
  }
  if (!profile.email) return null;

  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.full_name ?? undefined,
    metadata: { profile_id: profile.id },
  });

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id } as never)
    .eq("id", profile.id);

  return customer.id;
}
