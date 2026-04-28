import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SubcontractorForm } from "@/components/admin/SubcontractorForm";
import { createClient } from "@/lib/supabase/server";
import type { Subcontractor } from "@/lib/types";
import { updateSubcontractor } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSubcontractorPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("id", id)
    .maybeSingle<Subcontractor>();
  if (!sub) notFound();

  const action = updateSubcontractor.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Subcontractors / Edit</p>
        <h1 className="rw-display mt-2 text-3xl">Edit subcontractor</h1>
      </div>

      <Card>
        <SubcontractorForm
          sub={sub}
          action={action}
          cancelHref={`/admin/subcontractors/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
