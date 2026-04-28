import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ChangeOrderForm } from "@/components/admin/ChangeOrderForm";
import { createClient } from "@/lib/supabase/server";
import type { ChangeOrder, Job } from "@/lib/types";
import { updateChangeOrder } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChangeOrderPage({ params }: PageProps) {
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
    .select("id, title")
    .eq("id", co.job_id)
    .maybeSingle<Pick<Job, "id" | "title">>();

  const action = updateChangeOrder.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Change orders / Edit</p>
        <h1 className="rw-display mt-2 text-3xl">Edit change order</h1>
      </div>
      <Card>
        <ChangeOrderForm
          changeOrder={co}
          jobId={co.job_id}
          jobTitle={job?.title ?? "—"}
          action={action}
          cancelHref={`/admin/change-orders/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
