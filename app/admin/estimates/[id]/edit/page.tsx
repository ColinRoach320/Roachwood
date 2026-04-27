import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EstimateForm } from "@/components/admin/EstimateForm";
import { createClient } from "@/lib/supabase/server";
import { updateEstimateRecord } from "../../actions";
import type { Estimate, Job, Client } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEstimatePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle<Estimate>();

  if (!estimate) notFound();

  const [jobsRes, clientsRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, client_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, contact_name, company_name")
      .order("contact_name", { ascending: true }),
  ]);

  const allClients =
    (clientsRes.data ?? []) as Pick<
      Client,
      "id" | "contact_name" | "company_name"
    >[];
  const clientNameById = new Map(
    allClients.map((c) => [c.id, c.contact_name] as const),
  );
  const jobOptions = (jobsRes.data ?? []).map(
    (j: Pick<Job, "id" | "title" | "client_id">) => ({
      id: j.id,
      title: j.title,
      client_id: j.client_id,
      client_name: clientNameById.get(j.client_id) ?? null,
    }),
  );

  const action = updateEstimateRecord.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Estimates / Edit</p>
        <h1 className="rw-display mt-2 text-3xl">{estimate.title}</h1>
      </div>

      <Card>
        <EstimateForm
          estimate={estimate}
          jobs={jobOptions}
          clients={allClients}
          action={action}
          cancelHref={`/admin/estimates/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
