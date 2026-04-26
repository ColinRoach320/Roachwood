import { Card } from "@/components/ui/Card";
import { JobForm } from "@/components/admin/JobForm";
import { createClient } from "@/lib/supabase/server";
import { createJobRecord } from "../actions";

interface PageProps {
  searchParams: Promise<{ client_id?: string }>;
}

export default async function NewJobPage({ searchParams }: PageProps) {
  const { client_id } = await searchParams;
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, contact_name, company_name")
    .order("contact_name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Jobs / New</p>
        <h1 className="rw-display mt-2 text-3xl">New job</h1>
      </div>

      <Card>
        <JobForm
          clients={clients ?? []}
          defaultClientId={client_id}
          action={createJobRecord}
          cancelHref="/admin/jobs"
          submitLabel="Create job"
        />
      </Card>
    </div>
  );
}
