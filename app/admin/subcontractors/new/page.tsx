import { Card } from "@/components/ui/Card";
import { SubcontractorForm } from "@/components/admin/SubcontractorForm";
import { createSubcontractor } from "../actions";

export default function NewSubcontractorPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Subcontractors / New</p>
        <h1 className="rw-display mt-2 text-3xl">New subcontractor</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Track who you work with, what they charge, and whether you have
          their W-9 on file (you&apos;ll need it for 1099s if they cross
          $600 in a year).
        </p>
      </div>

      <Card>
        <SubcontractorForm
          action={createSubcontractor}
          cancelHref="/admin/subcontractors"
          submitLabel="Save subcontractor"
        />
      </Card>
    </div>
  );
}
