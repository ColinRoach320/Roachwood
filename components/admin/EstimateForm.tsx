"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { LineItemsEditor } from "@/components/admin/LineItemsEditor";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Estimate, EstimateStatus } from "@/lib/types";

interface JobOption {
  id: string;
  title: string;
  client_name: string | null;
}

interface Props {
  estimate?: Estimate | null;
  jobs: JobOption[];
  defaultJobId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const STATUS_OPTIONS: { value: EstimateStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function EstimateForm({
  estimate,
  jobs,
  defaultJobId,
  action,
  cancelHref,
  submitLabel = "Save estimate",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={estimate?.title ?? ""}
              placeholder="Kitchen cabinetry — Phase 1"
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
              defaultValue={estimate?.job_id ?? defaultJobId ?? ""}
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
              defaultValue={estimate?.status ?? "draft"}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Line items</Label>
          <LineItemsEditor
            initial={estimate?.line_items ?? []}
            initialTaxRate={estimate?.tax_rate ?? 0}
          />
          <FieldError name="line_items" />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={estimate?.notes ?? ""}
            rows={3}
            placeholder="Scope assumptions, exclusions, payment terms…"
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
