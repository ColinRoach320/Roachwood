import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ClientForm } from "@/components/admin/ClientForm";
import { createClient } from "@/lib/supabase/server";
import { updateClientRecord } from "../../actions";
import type { Client } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle<Client>();

  if (!client) notFound();

  // Bind the id to the action so the form submit signature stays
  // (prev, formData) => state and FormShell can render it.
  const action = updateClientRecord.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Clients / Edit</p>
        <h1 className="rw-display mt-2 text-3xl">{client.contact_name}</h1>
      </div>

      <Card>
        <ClientForm
          client={client}
          action={action}
          cancelHref={`/admin/clients/${id}`}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
