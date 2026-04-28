import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Printer, Send, Check, X as XIcon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button } from "@/components/ui/Button";
import { ChangeOrderStatusBadge } from "@/components/ui/Badge";
import { EmailDocumentForm } from "@/components/admin/EmailDocumentForm";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type { ChangeOrder, Job, Client, LineItem } from "@/lib/types";
import { setChangeOrderStatusVoid } from "../actions";
import { sendChangeOrderEmail } from "../email-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChangeOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: co } = await supabase
    .from("change_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<ChangeOrder>();
  if (!co) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .eq("id", co.job_id)
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

  const items = (co.line_items ?? []) as LineItem[];
  const emailAction = sendChangeOrderEmail.bind(null, id);

  const defaultSubject = `Change order from Roachwood — ${job?.title ?? co.title}`;
  const defaultMessage =
    `Hi ${client?.contact_name ?? "there"},\n\n` +
    `We wanted to walk you through a scope change on your project ${
      job?.title ?? "your project"
    }. Please review the attached change order and let us know if you approve.\n\n` +
    `This change order must be approved before we proceed with the additional work.\n\n` +
    `If you have any questions, just reach out.\n\n` +
    `Colin Roach | Roachwood | (586) 344-0982 | roachwood.co`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">
            <Link href="/admin" className="hover:text-gold-300">
              Admin
            </Link>{" "}
            / Change order
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="rw-display text-3xl">CO-{co.co_number}</h1>
            <ChangeOrderStatusBadge status={co.status} />
          </div>
          <p className="mt-1 text-sm text-charcoal-300">{co.title}</p>
          <p className="mt-2 text-sm text-charcoal-400">
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
            {formatDate(co.created_at)}
            {co.approved_at ? ` · Approved ${formatDate(co.approved_at)}` : ""}
            {co.declined_at ? ` · Declined ${formatDate(co.declined_at)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {co.status === "draft" ? (
            <form action={setChangeOrderStatusVoid.bind(null, id, "sent")}>
              <Button type="submit" size="sm" variant="outline">
                <Send className="h-4 w-4" /> Mark sent
              </Button>
            </form>
          ) : null}
          {co.status === "draft" || co.status === "sent" ? (
            <>
              <form action={setChangeOrderStatusVoid.bind(null, id, "approved")}>
                <Button type="submit" size="sm">
                  <Check className="h-4 w-4" /> Approve
                </Button>
              </form>
              <form action={setChangeOrderStatusVoid.bind(null, id, "declined")}>
                <Button type="submit" size="sm" variant="secondary">
                  <XIcon className="h-4 w-4" /> Decline
                </Button>
              </form>
            </>
          ) : null}
          <ButtonLink
            href={`/admin/change-orders/${id}/edit`}
            size="sm"
            variant="secondary"
          >
            <Pencil className="h-4 w-4" /> Edit
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
        <ButtonLink
          href={`/api/pdf/change-order/${id}`}
          target="_blank"
          rel="noopener"
          size="lg"
          variant="outline"
          className="w-full justify-center sm:w-auto"
        >
          <Printer className="h-4 w-4" /> Print change order
        </ButtonLink>
        <EmailDocumentForm
          action={emailAction}
          documentLabel="change order"
          defaultTo={client?.email ?? ""}
          defaultSubject={defaultSubject}
          defaultMessage={defaultMessage}
        />
      </div>

      {co.description ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Scope change</CardTitle>
              <CardDescription>What changed and why.</CardDescription>
            </div>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm text-charcoal-200">
            {co.description}
          </p>
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
                <td colSpan={4} className="px-6 py-8 text-center text-charcoal-400">
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
                {formatMoney(co.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-6 py-2 text-right text-charcoal-400">
                Tax ({Number(co.tax_rate ?? 0)}%)
              </td>
              <td className="px-6 py-2 text-right text-charcoal-100 tabular-nums">
                {formatMoney(co.tax_amount)}
              </td>
            </tr>
            <tr className="border-t border-charcoal-700 bg-charcoal-900/40">
              <td colSpan={3} className="px-6 py-3 text-right text-charcoal-50">
                Change order total
              </td>
              <td className="px-6 py-3 text-right font-display text-lg text-gold-300 tabular-nums">
                {formatMoney(co.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {co.notes ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm text-charcoal-200">
            {co.notes}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

