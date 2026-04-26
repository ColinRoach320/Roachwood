"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Job, Client, JobStatus } from "@/lib/types";

interface Props {
  job?: Job | null;
  clients: Pick<Client, "id" | "contact_name" | "company_name">[];
  defaultClientId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function JobForm({
  job,
  clients,
  defaultClientId,
  action,
  cancelHref,
  submitLabel = "Save job",
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
              defaultValue={job?.title ?? ""}
              required
              autoFocus
            />
            <FieldError name="title" />
          </div>

          <div>
            <Label htmlFor="client_id">Client *</Label>
            <select
              id="client_id"
              name="client_id"
              defaultValue={job?.client_id ?? defaultClientId ?? ""}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contact_name}
                  {c.company_name ? ` — ${c.company_name}` : ""}
                </option>
              ))}
            </select>
            <FieldError name="client_id" />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={job?.status ?? "quoted"}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={job?.description ?? ""}
              rows={4}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address">Job site address</Label>
            <Input id="address" name="address" defaultValue={job?.address ?? ""} />
          </div>

          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={job?.start_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="end_date">Target end date</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              defaultValue={job?.end_date ?? ""}
            />
          </div>

          <div>
            <Label htmlFor="estimated_value">Estimated value (USD)</Label>
            <Input
              id="estimated_value"
              name="estimated_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={job?.estimated_value ?? ""}
            />
            <FieldError name="estimated_value" />
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
