import { Card } from "@/components/ui/Card";
import { EstimateForm } from "@/components/admin/EstimateForm";
import { createClient } from "@/lib/supabase/server";
import { createEstimateRecord } from "../actions";
import type { Job, Client } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ job_id?: string }>;
}

export default async function NewEstimatePage({ searchParams }: PageProps) {
  const { job_id } = await searchParams;
  const supabase = await createClient();

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

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Estimates / New</p>
        <h1 className="rw-display mt-2 text-3xl">New estimate</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Whatever you save here lands in the database — client, project,
          and estimate — even before the bid is won.
        </p>
      </div>

      <Card>
        <EstimateForm
          jobs={jobOptions}
          clients={allClients}
          defaultJobId={job_id}
          action={createEstimateRecord}
          cancelHref="/admin/estimates"
          submitLabel="Save estimate"
        />
      </Card>
    </div>
  );
}
