"use server";

import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { ensureStripeCustomer } from "@/lib/stripe-customer";
import { type ActionState, fail, ok } from "@/lib/actions";
import type { Profile } from "@/lib/types";

/**
 * Look up the current portal user's profile + ensure a Stripe customer
 * exists. Returns the customer id and the profile, or null if anything
 * is missing (no session, no email, Stripe not configured).
 */
async function currentCustomer(): Promise<
  | { customerId: string; profile: Profile }
  | { customerId: null; reason: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { customerId: null, reason: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, stripe_customer_id, created_at")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) return { customerId: null, reason: "Profile not found." };

  const customerId = await ensureStripeCustomer({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    stripe_customer_id: profile.stripe_customer_id,
  });
  if (!customerId) {
    return {
      customerId: null,
      reason: profile.email
        ? "Payments are not configured."
        : "Add an email to your profile before saving a payment method.",
    };
  }
  return { customerId, profile };
}

/**
 * Create a SetupIntent so the browser can collect + save a card via
 * Stripe Elements without actually charging anything. The client_secret
 * goes back to the AddCardForm component.
 */
export async function createSetupIntent(): Promise<
  { ok: true; clientSecret: string } | { ok: false; error: string }
> {
  const me = await currentCustomer();
  if (me.customerId === null) return { ok: false, error: me.reason };

  const intent = await stripe.setupIntents.create({
    customer: me.customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });
  if (!intent.client_secret) {
    return { ok: false, error: "Stripe did not return a client_secret." };
  }
  return { ok: true, clientSecret: intent.client_secret };
}

/**
 * Generate (or return the existing) Stripe Payment Link for an
 * invoice the current portal user owns. Mirrors the admin-side
 * `/api/stripe/create-payment-link` route but gates on the client's
 * own session via the existing invoice client-read RLS — if the
 * select returns the row, the user is allowed to pay it.
 */
export async function getInvoicePaymentLink(
  invoiceId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, title, total, amount_paid, status, stripe_payment_link, job_id")
    .eq("id", invoiceId)
    .maybeSingle<{
      id: string;
      title: string;
      total: number;
      amount_paid: number;
      status: string;
      stripe_payment_link: string | null;
      job_id: string;
    }>();
  if (!invoice) return { ok: false, error: "Invoice not found." };

  if (invoice.stripe_payment_link) {
    return { ok: true, url: invoice.stripe_payment_link };
  }

  const due = Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0);
  if (!(due > 0)) {
    return { ok: false, error: "Invoice has no balance due." };
  }
  const amountCents = Math.round(due * 100);

  const product = await stripe.products.create({
    name: `Roachwood — ${invoice.title}`,
    metadata: { invoice_id: invoice.id },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amountCents,
    currency: "usd",
  });
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoice_id: invoice.id },
    payment_intent_data: { metadata: { invoice_id: invoice.id } },
    after_completion: {
      type: "hosted_confirmation",
      hosted_confirmation: {
        custom_message:
          "Thanks for your payment — Roachwood will send a receipt shortly.",
      },
    },
  });

  // Persist via service role so the next page load skips this whole
  // round-trip. The admin policy on invoices owns the write.
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();
  await admin
    .from("invoices")
    .update({ stripe_payment_link: link.url } as never)
    .eq("id", invoice.id);

  revalidatePath("/portal/payments");
  if (invoice.job_id) revalidatePath(`/portal/jobs/${invoice.job_id}`);
  return { ok: true, url: link.url };
}

/**
 * Detach a saved payment method from the current user's Stripe
 * customer. Verifies the PM actually belongs to this customer first
 * so a hostile caller can't pass an arbitrary id.
 */
export async function removePaymentMethod(
  paymentMethodId: string,
): Promise<ActionState> {
  const me = await currentCustomer();
  if (me.customerId === null) return fail(me.reason);

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== me.customerId) {
    return fail("That payment method isn't yours.");
  }

  await stripe.paymentMethods.detach(paymentMethodId);
  revalidatePath("/portal/payments");
  return ok("Payment method removed.");
}
