import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

// Stripe webhook signature verification needs the raw request body, so
// pin to Node runtime. Edge runtime can't reliably hand us untouched
// bytes here.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed — silently accepting events without verification would
    // let an attacker mark invoices paid for free.
    return new Response("Webhook not configured", { status: 503 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad signature";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object);
  }

  // Other event types are intentionally ignored for now — only the
  // success path matters for the current invoice flow.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) return;

  // Stripe quotes amounts in the smallest currency unit (cents for USD).
  const amountPaid = (session.amount_total ?? 0) / 100;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .update({
      status: "paid",
      amount_paid: amountPaid,
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", invoiceId)
    .select("id, job_id")
    .maybeSingle<{ id: string; job_id: string }>();

  if (invoice) {
    revalidatePath(`/admin/invoices/${invoice.id}`);
    revalidatePath("/admin/invoices");
    revalidatePath("/admin");
    if (invoice.job_id) {
      revalidatePath(`/admin/jobs/${invoice.job_id}`);
      revalidatePath(`/portal/jobs/${invoice.job_id}`);
    }
  }
}
