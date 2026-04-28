"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface JobOption {
  id: string;
  title: string;
}

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  jobs: JobOption[];
}

export function RecordSubPaymentForm({ action, jobs }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="amount">Amount (USD) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
            <FieldError name="amount" />
          </div>
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <Label htmlFor="job_id">Job</Label>
            <select id="job_id" name="job_id" defaultValue="" className="rw-input">
              <option value="">— Not job-specific —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            placeholder="What was paid for, check #, etc."
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton label="Log payment" pendingLabel="Saving…" />
        </div>
      </form>
    </FormShell>
  );
}
