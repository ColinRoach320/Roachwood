import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowRight, Printer } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button } from "@/components/ui/Button";
import { EstimateStatusBadge } from "@/components/ui/Badge";
import { EmailDocumentForm } from "@/components/admin/EmailDocumentForm";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Estimate, Job, Client, LineItem } from "@/lib/types";
import { setEstimateStatus } from "../actions";
import { sendEstimateEmail } from "../email-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EstimateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle<Estimate>();

  if (!estimate) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .eq("id", estimate.job_id)
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

  const items = (estimate.line_items ?? []) as LineItem[];
  const emailAction = sendEstimateEmail.bind(null, id);
  const defaultSubject = `Estimate from Roachwood — ${job?.title ?? estimate.title}`;
  const defaultMessage = `Hi ${client?.contact_name ?? "there"},\n\nPlease find attached the estimate for ${job?.title ?? "your project"}. Let me know if you have any questions or want to make changes.\n\nThanks,\nColin Roach\nRoachwood`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">
            <Link href="/admin/estimates" className="hover:text-gold-300">
              Estimates
            </Link>{" "}
            / Detail
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="rw-display text-3xl">{estimate.title}</h1>
            <EstimateStatusBadge status={estimate.status} />
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
            {formatDate(estimate.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {estimate.status === "draft" ? (
            <form action={setEstimateStatus.bind(null, id, "sent")}>
              <Button type="submit" size="sm" variant="outline">
                Mark sent
              </Button>
            </form>
          ) : null}
          {estimate.status === "draft" || estimate.status === "sent" ? (
            <>
              <form action={setEstimateStatus.bind(null, id, "won")}>
                <Button type="submit" size="sm">
                  Won
                </Button>
              </form>
              <form action={setEstimateStatus.bind(null, id, "lost")}>
                <Button type="submit" size="sm" variant="secondary">
                  Lost
                </Button>
              </form>
              <form action={setEstimateStatus.bind(null, id, "no_response")}>
                <Button type="submit" size="sm" variant="ghost">
                  No response
                </Button>
              </form>
            </>
          ) : null}
          {estimate.status === "won" ? (
            <ButtonLink
              href={`/admin/invoices/new?estimate_id=${estimate.id}`}
              size="sm"
            >
              Convert to invoice <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={`/admin/estimates/${id}/edit`}
            size="sm"
            variant="secondary"
          >
            <Pencil className="h-4 w-4" /> Edit
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
        <ButtonLink
          href={`/api/pdf/estimate/${id}`}
          target="_blank"
          rel="noopener"
          size="lg"
          variant="outline"
          className="w-full justify-center sm:w-auto"
        >
          <Printer className="h-4 w-4" /> Print estimate
        </ButtonLink>
        <EmailDocumentForm
          action={emailAction}
          documentLabel="estimate"
          defaultTo={client?.email ?? ""}
          defaultSubject={defaultSubject}
          defaultMessage={defaultMessage}
        />
      </div>

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
                {formatMoney(estimate.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-6 py-2 text-right text-charcoal-400">
                Tax ({Number(estimate.tax_rate ?? 0)}%)
              </td>
              <td className="px-6 py-2 text-right text-charcoal-100 tabular-nums">
                {formatMoney(estimate.tax_amount)}
              </td>
            </tr>
            <tr className="border-t border-charcoal-700 bg-charcoal-900/40">
              <td colSpan={3} className="px-6 py-3 text-right text-charcoal-50">
                Total
              </td>
              <td className="px-6 py-3 text-right font-display text-lg text-gold-300 tabular-nums">
                {formatMoney(estimate.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {estimate.notes ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm text-charcoal-200">
            {estimate.notes}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
