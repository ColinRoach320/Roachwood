import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { CreditCard, Landmark, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/stripe-customer";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import { AddCardForm } from "@/components/portal/AddCardForm";
import { RemoveCardButton } from "@/components/portal/RemoveCardButton";
import { PayNowButton } from "@/components/portal/PayNowButton";
import type { Invoice, Job, Profile } from "@/lib/types";

export default async function PortalPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/payments");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, stripe_customer_id, created_at")
    .eq("id", user.id)
    .single<Profile>();

  // Try to set up the Stripe customer up front so the rest of the
  // page can read PMs and history. Failures here surface as a banner.
  const customerId = profile
    ? await ensureStripeCustomer({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        stripe_customer_id: profile.stripe_customer_id,
      })
    : null;

  // Invoices for the current client (RLS scopes the query). Split
  // into outstanding (sent/overdue with balance due) and history.
  const [invoicesRes, jobsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, title"),
  ]);
  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const jobs = (jobsRes.data ?? []) as Pick<Job, "id" | "title">[];
  const jobName = (id: string) =>
    jobs.find((j) => j.id === id)?.title ?? "(project)";

  const outstanding = invoices
    .filter((i) => {
      const due = Number(i.total ?? 0) - Number(i.amount_paid ?? 0);
      return due > 0 && (i.status === "sent" || i.status === "overdue");
    })
    .map((i) => ({
      ...i,
      due: Number(i.total ?? 0) - Number(i.amount_paid ?? 0),
    }));
  const outstandingTotal = outstanding.reduce((s, i) => s + i.due, 0);

  const paid = invoices
    .filter(
      (i) =>
        i.status === "paid" || Number(i.amount_paid ?? 0) > 0,
    )
    .slice(0, 50);

  // Saved payment methods (cards). Fetched from Stripe directly so
  // there's no local cache to keep in sync.
  let savedMethods: Awaited<
    ReturnType<typeof stripe.paymentMethods.list>
  >["data"] = [];
  if (customerId) {
    const list = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
    savedMethods = list.data;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const stripeReady = !!customerId && !!publishableKey;

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Payments</p>
        <h1 className="rw-display mt-2 text-3xl">Billing &amp; payments</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Pay invoices, save a card on file, and review your payment
          history — all in one place.
        </p>
      </div>

      {!stripeReady ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <div>
              <CardTitle className="text-amber-200">
                Payments not fully configured
              </CardTitle>
              <CardDescription>
                {!publishableKey
                  ? "Stripe publishable key is missing on the deploy. Reach out to Roachwood and we'll get it sorted."
                  : !profile?.email
                    ? "Add an email to your profile so we can attach payments to it."
                    : "We couldn't connect to Stripe. Try refreshing in a minute."}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {/* Outstanding balance */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="rw-eyebrow">Outstanding balance</p>
            <p className="mt-1 font-display text-3xl text-charcoal-50 tabular-nums">
              {formatMoney(outstandingTotal)}
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-400">
            {outstanding.length} unpaid invoice
            {outstanding.length === 1 ? "" : "s"}
          </p>
        </div>
        {outstanding.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal-400">
            You&apos;re all paid up. Thank you.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {outstanding.map((i) => (
              <li
                key={i.id}
                className="rounded-lg border border-charcoal-700 bg-charcoal-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-charcoal-100">{i.title}</p>
                    <p className="text-xs text-charcoal-400">
                      {jobName(i.job_id)} · Created {formatDate(i.created_at)}
                      {i.due_date ? ` · Due ${formatDate(i.due_date)}` : ""}
                    </p>
                    <p className="mt-2 font-display text-xl text-charcoal-50 tabular-nums">
                      {formatMoney(i.due)}
                    </p>
                  </div>
                  <PayNowButton
                    invoiceId={i.id}
                    amountLabel={formatMoney(i.due)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Saved payment methods */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Saved cards</CardTitle>
            <CardDescription>
              Cards on file are managed by Stripe — we never store the
              full number.
            </CardDescription>
          </div>
        </CardHeader>

        {savedMethods.length === 0 ? (
          <p className="text-sm text-charcoal-400">
            No saved cards yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {savedMethods.map((pm) => {
              const card = pm.card;
              if (!card) return null;
              const label = `${card.brand} ending in ${card.last4}`;
              return (
                <li
                  key={pm.id}
                  className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-900/40 px-3 py-2"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="h-4 w-4 text-charcoal-400" />
                    <div>
                      <p className="text-charcoal-100">
                        {card.brand.toUpperCase()} ···· {card.last4}
                      </p>
                      <p className="text-xs text-charcoal-500">
                        Expires {String(card.exp_month).padStart(2, "0")}/
                        {String(card.exp_year).slice(-2)}
                      </p>
                    </div>
                  </div>
                  <RemoveCardButton paymentMethodId={pm.id} label={label} />
                </li>
              );
            })}
          </ul>
        )}

        {stripeReady ? (
          <div className="mt-5">
            <AddCardForm publishableKey={publishableKey} />
          </div>
        ) : null}

        {/* Bank transfer / ACH placeholder */}
        <div className="mt-5 flex items-start gap-3 rounded-md border border-charcoal-700 bg-charcoal-900/40 p-3 text-sm text-charcoal-300">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-500" />
          <div>
            <p className="text-charcoal-200">Bank transfer (ACH)</p>
            <p className="mt-0.5 text-xs text-charcoal-500">
              Coming soon — bank-account payments require verification
              through Stripe Financial Connections. For now, please use
              a card or reach out to arrange a check.
            </p>
          </div>
        </div>
      </Card>

      {/* Payment history */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>
              {paid.length === 0
                ? "Once you've paid an invoice it'll show up here."
                : `${paid.length} invoice${paid.length === 1 ? "" : "s"} with payments recorded.`}
            </CardDescription>
          </div>
        </CardHeader>
        {paid.length === 0 ? (
          <div className="flex items-start gap-2 px-6 py-6 text-sm text-charcoal-400">
            <AlertCircle className="mt-0.5 h-4 w-4 text-charcoal-500" />
            <p>No payments yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
                <th className="px-6 py-3 font-medium">Invoice</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700">
              {paid.map((i) => (
                <tr key={i.id}>
                  <td className="px-6 py-3 text-charcoal-100">{i.title}</td>
                  <td className="px-6 py-3 text-charcoal-300">
                    {jobName(i.job_id)}
                  </td>
                  <td className="px-6 py-3 text-charcoal-400">
                    {formatDate(i.due_date ?? i.created_at)}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-300 tabular-nums">
                    {formatMoney(i.amount_paid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
