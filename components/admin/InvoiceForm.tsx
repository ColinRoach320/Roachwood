"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { LineItemsEditor } from "@/components/admin/LineItemsEditor";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Invoice, InvoiceStatus } from "@/lib/types";

interface JobOption {
  id: string;
  title: string;
  client_name: string | null;
}

interface Props {
  invoice?: Invoice | null;
  jobs: JobOption[];
  defaultJobId?: string;
  defaultEstimateId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function InvoiceForm({
  invoice,
  jobs,
  defaultJobId,
  defaultEstimateId,
  action,
  cancelHref,
  submitLabel = "Save invoice",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        {invoice?.estimate_id || defaultEstimateId ? (
          <input
            type="hidden"
            name="estimate_id"
            value={invoice?.estimate_id ?? defaultEstimateId ?? ""}
          />
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={invoice?.title ?? ""}
              placeholder="Final invoice — kitchen build"
              required
              autoFocus
            />
            <FieldError name="title" />
          </div>
          <div>
            <Label htmlFor="job_id">Job *</Label>
            <select
              id="job_id"
              name="job_id"
              defaultValue={invoice?.job_id ?? defaultJobId ?? ""}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select a job…
              </option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                  {j.client_name ? ` — ${j.client_name}` : ""}
                </option>
              ))}
            </select>
            <FieldError name="job_id" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={invoice?.status ?? "draft"}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="due_date">Due date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={invoice?.due_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="amount_paid">Amount paid (USD)</Label>
            <Input
              id="amount_paid"
              name="amount_paid"
              type="number"
              step="0.01"
              min="0"
              defaultValue={invoice?.amount_paid ?? 0}
            />
            <FieldError name="amount_paid" />
          </div>
        </div>

        <div>
          <Label>Line items</Label>
          <LineItemsEditor
            initial={invoice?.line_items ?? []}
            initialTaxRate={invoice?.tax_rate ?? 0}
          />
          <FieldError name="line_items" />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={invoice?.notes ?? ""}
            rows={3}
            placeholder="Payment terms, deposit details, thank-you note…"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-charcoal-700 pt-5">
          <ButtonLink href={cancelHref} variant="ghost">
            Cancel
          </ButtonLink>
          <SubmitButton label={submitLabel} pendingLabel="Saving…" />
        </div>
      </form>
    </FormShell>
  );
}
