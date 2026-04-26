import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { createClient } from "@/lib/supabase/server";
import { updateInvoiceRecord } from "../../actions";
import type { Invoice, Job, Client } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle<Invoice>();

  if (!invoice) notFound();

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

  const action = updateInvoiceRecord.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Invoices / Edit</p>
        <h1 className="rw-display mt-2 text-3xl">{invoice.title}</h1>
      </div>

      <Card>
        <InvoiceForm
          invoice={invoice}
          jobs={jobOptions}
          action={action}
          cancelHref={`/admin/invoices/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
