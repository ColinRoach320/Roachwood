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

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .order("created_at", { ascending: false });
  const clientIds = Array.from(
    new Set((jobs ?? []).map((j: Pick<Job, "client_id">) => j.client_id)),
  );
  const { data: clients } = clientIds.length
    ? await supabase.from("clients").select("id, contact_name").in("id", clientIds)
    : { data: [] };
  const clientMap = new Map(
    (clients ?? []).map((c: Pick<Client, "id" | "contact_name">) => [c.id, c.contact_name]),
  );
  const jobOptions = (jobs ?? []).map(
    (j: Pick<Job, "id" | "title" | "client_id">) => ({
      id: j.id,
      title: j.title,
      client_name: clientMap.get(j.client_id) ?? null,
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
          action={action}
          cancelHref={`/admin/estimates/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
