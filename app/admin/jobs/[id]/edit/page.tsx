import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { JobForm } from "@/components/admin/JobForm";
import { createClient } from "@/lib/supabase/server";
import { updateJobRecord } from "../../actions";
import type { Job } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditJobPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle<Job>();

  if (!job) notFound();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, contact_name, company_name")
    .order("contact_name", { ascending: true });

  const action = updateJobRecord.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Jobs / Edit</p>
        <h1 className="rw-display mt-2 text-3xl">{job.title}</h1>
      </div>

      <Card>
        <JobForm
          job={job}
          clients={clients ?? []}
          action={action}
          cancelHref={`/admin/jobs/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
