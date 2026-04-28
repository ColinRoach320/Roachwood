import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ChangeOrderForm } from "@/components/admin/ChangeOrderForm";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import { createChangeOrder } from "../actions";

interface PageProps {
  searchParams: Promise<{ job_id?: string }>;
}

export default async function NewChangeOrderPage({ searchParams }: PageProps) {
  const { job_id } = await searchParams;
  if (!job_id) redirect("/admin/jobs");

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("id", job_id)
    .maybeSingle<Pick<Job, "id" | "title">>();
  if (!job) notFound();

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Change orders / New</p>
        <h1 className="rw-display mt-2 text-3xl">New change order</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Document a scope change. Saved as draft — review the line items
          and total, then mark it sent and email the client to approve.
        </p>
      </div>

      <Card>
        <ChangeOrderForm
          jobId={job.id}
          jobTitle={job.title}
          action={createChangeOrder}
          cancelHref={`/admin/jobs/${job.id}`}
          submitLabel="Save change order"
        />
      </Card>
    </div>
  );
}
