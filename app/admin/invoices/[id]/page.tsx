import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import { RecordPaymentForm } from "@/components/admin/RecordPaymentForm";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Invoice, Job, Client, LineItem } from "@/lib/types";
import { setInvoiceStatus, recordInvoicePayment } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle<Invoice>();

  if (!invoice) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .eq("id", invoice.job_id)
    .maybeSingle<Pick<Job, "id" | "title" | "client_id">>();

  const { data: client } = job
    ? await supabase
        .from("clients")
        .select("id, contact_name, company_name, email")
        .eq("id", job.client_id)
        .maybeSingle<
          Pick<Client, "id" | "contact_name" | "company_name" | "email">
        >()
    : { data: null };

  const items = (invoice.line_items ?? []) as LineItem[];
  const remaining = Math.max(
    0,
    Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0),
  );
  const paymentAction = recordInvoicePayment.bind(null, id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">
            <Link href="/admin/invoices" className="hover:text-gold-300">
              Invoices
            </Link>{" "}
            / Detail
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="rw-display text-3xl">{invoice.title}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-charcoal-400">
            {job ? (
              <Link
                href={`/admin/jobs/${job.id}`}
                className="hover:text-gold-400"
              >
                {job.title}
              </Link>
            ) : (
              "—"
            )}
            {client ? ` · ${client.contact_name}` : ""}
            {" · Created "}
            {formatDate(invoice.created_at)}
            {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "draft" ? (
            <form action={setInvoiceStatus.bind(null, id, "sent")}>
              <Button type="submit" size="sm" variant="outline">
                Mark sent
              </Button>
            </form>
          ) : null}
          {invoice.status === "sent" ? (
            <form action={setInvoiceStatus.bind(null, id, "overdue")}>
              <Button type="submit" size="sm" variant="secondary">
                Mark overdue
              </Button>
            </form>
          ) : null}
          {invoice.status !== "paid" ? (
            <form action={setInvoiceStatus.bind(null, id, "paid")}>
              <Button type="submit" size="sm">
                Mark paid
              </Button>
            </form>
          ) : null}
          <ButtonLink
            href={`/admin/invoices/${id}/edit`}
            size="sm"
            variant="secondary"
          >
            <Pencil className="h-4 w-4" /> Edit
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total" value={formatMoney(invoice.total)} />
        <Stat label="Paid" value={formatMoney(invoice.amount_paid)} />
        <Stat label="Remaining" value={formatMoney(remaining)} />
      </div>

      {remaining > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Record a payment</CardTitle>
              <CardDescription>
                Outstanding balance: {formatMoney(remaining)}.
              </CardDescription>
            </div>
          </CardHeader>
          <RecordPaymentForm action={paymentAction} remaining={remaining} />
        </Card>
      ) : null}

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Line items</CardTitle>
            <CardDescription>
              {items.length} line{items.length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium text-right">Qty</th>
              <th className="px-6 py-3 font-medium text-right">Unit price</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-charcoal-400"
                >
                  No line items.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td className="px-6 py-3 text-charcoal-100">
                    {it.description || (
                      <span className="text-charcoal-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-charcoal-300 tabular-nums">
                    {it.quantity}
                  </td>
                  <td className="px-6 py-3 text-right text-charcoal-300 tabular-nums">
                    {formatMoney(it.unit_price)}
                  </td>
                  <td className="px-6 py-3 text-right text-charcoal-100 tabular-nums">
                    {formatMoney(it.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-charcoal-700">
              <td colSpan={3} className="px-6 py-2 text-right text-charcoal-400">
                Subtotal
              </td>
              <td className="px-6 py-2 text-right text-charcoal-100 tabular-nums">
                {formatMoney(invoice.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-6 py-2 text-right text-charcoal-400">
                Tax ({Number(invoice.tax_rate ?? 0)}%)
              </td>
              <td className="px-6 py-2 text-right text-charcoal-100 tabular-nums">
                {formatMoney(invoice.tax_amount)}
              </td>
            </tr>
            <tr className="border-t border-charcoal-700 bg-charcoal-900/40">
              <td colSpan={3} className="px-6 py-3 text-right text-charcoal-50">
                Total
              </td>
              <td className="px-6 py-3 text-right font-display text-lg text-gold-300 tabular-nums">
                {formatMoney(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {invoice.notes ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm text-charcoal-200">
            {invoice.notes}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rw-card p-5">
      <p className="rw-eyebrow">{label}</p>
      <p className="mt-2 font-display text-2xl text-charcoal-50">{value}</p>
    </div>
  );
}
