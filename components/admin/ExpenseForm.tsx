"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Expense, ExpenseCategory } from "@/lib/types";

interface JobOption {
  id: string;
  title: string;
  client_name: string | null;
}

interface Props {
  expense?: Expense | null;
  jobs: JobOption[];
  defaultJobId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function ExpenseForm({
  expense,
  jobs,
  defaultJobId,
  action,
  cancelHref,
  submitLabel = "Save expense",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="job_id">Job *</Label>
            <select
              id="job_id"
              name="job_id"
              defaultValue={expense?.job_id ?? defaultJobId ?? ""}
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
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue={expense?.category ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              name="vendor"
              defaultValue={expense?.vendor ?? ""}
              placeholder="Home Depot, J. Smith Plumbing…"
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount (USD) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={expense?.amount ?? ""}
              required
              autoFocus={!expense}
            />
            <FieldError name="amount" />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={
                expense?.date ?? new Date().toISOString().slice(0, 10)
              }
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={expense?.notes ?? ""}
              rows={3}
              placeholder="Receipt #, what it was for…"
            />
          </div>
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
