import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { createClient } from "@/lib/supabase/server";
import { createInvoiceRecord } from "../actions";
import type { Job, Client, Estimate } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ job_id?: string; estimate_id?: string }>;
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const { job_id, estimate_id } = await searchParams;
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .order("created_at", { ascending: false });

  const clientIds = Array.from(
    new Set((jobs ?? []).map((j: Pick<Job, "client_id">) => j.client_id)),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, contact_name")
        .in("id", clientIds)
    : { data: [] };
  const clientMap = new Map(
    (clients ?? []).map((c: Pick<Client, "id" | "contact_name">) => [
      c.id,
      c.contact_name,
    ]),
  );
  const jobOptions = (jobs ?? []).map(
    (j: Pick<Job, "id" | "title" | "client_id">) => ({
      id: j.id,
      title: j.title,
      client_name: clientMap.get(j.client_id) ?? null,
    }),
  );

  // If converting from an estimate, prefill from it.
  let prefill: Estimate | null = null;
  let resolvedJobId = job_id;
  if (estimate_id) {
    const { data: est } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", estimate_id)
      .maybeSingle<Estimate>();
    if (!est) notFound();
    prefill = est;
    resolvedJobId = resolvedJobId ?? est.job_id;
  }

  // Build a synthetic Invoice-shaped object for default values.
  const seed = prefill
    ? {
        id: "",
        job_id: prefill.job_id,
        estimate_id: prefill.id,
        title: prefill.title,
        line_items: prefill.line_items,
        subtotal: prefill.subtotal,
        tax_rate: prefill.tax_rate,
        tax_amount: prefill.tax_amount,
        total: prefill.total,
        amount_paid: 0,
        notes: prefill.notes,
        due_date: null,
        status: "draft" as const,
        stripe_payment_link: null,
        stripe_payment_intent_id: null,
        paid_at: null,
        created_at: new Date().toISOString(),
      }
    : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Invoices / New</p>
        <h1 className="rw-display mt-2 text-3xl">
          {prefill ? `Invoice from “${prefill.title}”` : "New invoice"}
        </h1>
        {prefill ? (
          <p className="mt-2 text-sm text-charcoal-400">
            Lines pre-filled from the approved estimate. Review before saving.
          </p>
        ) : null}
      </div>

      <Card>
        <InvoiceForm
          invoice={seed}
          jobs={jobOptions}
          defaultJobId={resolvedJobId}
          defaultEstimateId={estimate_id}
          action={createInvoiceRecord}
          cancelHref="/admin/invoices"
          submitLabel="Create invoice"
        />
      </Card>
    </div>
  );
}
