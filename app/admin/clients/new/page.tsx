import { Card } from "@/components/ui/Card";
import { ClientForm } from "@/components/admin/ClientForm";
import { createClientRecord } from "../actions";

export default function NewClientPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Clients</p>
        <h1 className="rw-display mt-2 text-3xl">New client</h1>
        <p className="mt-2 text-sm text-charcoal-300">
          Add a homeowner or company. You can link jobs to them next.
        </p>
      </div>

      <Card>
        <ClientForm
          action={createClientRecord}
          cancelHref="/admin/clients"
          submitLabel="Create client"
        />
      </Card>
    </div>
  );
}
