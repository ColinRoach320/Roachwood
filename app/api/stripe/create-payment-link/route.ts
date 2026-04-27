import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/pdf-auth";
import type { Invoice } from "@/lib/types";

// Stripe SDK relies on Node APIs.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { invoice_id?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const invoiceId = payload.invoice_id;
  if (!invoiceId) {
    return NextResponse.json(
      { error: "Missing invoice_id" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .select("id, title, total, amount_paid, status, stripe_payment_link, job_id")
    .eq("id", invoiceId)
    .maybeSingle<
      Pick<
        Invoice,
        | "id"
        | "title"
        | "total"
        | "amount_paid"
        | "status"
        | "stripe_payment_link"
        | "job_id"
      >
    >();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Idempotent: if a link already exists, just return it. Regenerating
  // would orphan the old Stripe Product/Price objects.
  if (invoice.stripe_payment_link) {
    return NextResponse.json({
      url: invoice.stripe_payment_link,
      reused: true,
    });
  }

  const due =
    Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0);
  if (!(due > 0)) {
    return NextResponse.json(
      { error: "Invoice has no balance due." },
      { status: 400 },
    );
  }

  const amountCents = Math.round(due * 100);

  // Stripe Payment Links require a Product + Price. We create a
  // dedicated Product per invoice so the Stripe dashboard reads
  // cleanly ("Roachwood — <title>") instead of generic line items.
  const product = await stripe.products.create({
    name: `Roachwood — ${invoice.title}`,
    metadata: { invoice_id: invoice.id },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amountCents,
    currency: "usd",
  });

  // Set metadata at both levels: PaymentLink → forwarded to the
  // Checkout Session, and payment_intent_data → forwarded to the
  // resulting PaymentIntent. The webhook reads from the Session.
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoice_id: invoice.id },
    payment_intent_data: { metadata: { invoice_id: invoice.id } },
    after_completion: {
      type: "hosted_confirmation",
      hosted_confirmation: {
        custom_message:
          "Thanks for your business — Roachwood will be in touch shortly.",
      },
    },
  });

  const { error: updateErr } = await admin
    .from("invoices")
    .update({ stripe_payment_link: paymentLink.url })
    .eq("id", invoice.id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  revalidatePath(`/admin/invoices/${invoice.id}`);
  revalidatePath("/admin/invoices");
  if (invoice.job_id) revalidatePath(`/portal/jobs/${invoice.job_id}`);

  return NextResponse.json({ url: paymentLink.url, reused: false });
}
