"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { MoneyInput } from "@/components/admin/MoneyInput";
import { DateField } from "@/components/admin/DateField";
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
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

// Mirrors the sentinel in app/admin/jobs/actions.ts. Stays a constant
// so the two stay in sync.
const NEW_CLIENT_VALUE = "__new__";

export function JobForm({
  job,
  clients,
  defaultClientId,
  action,
  cancelHref,
  submitLabel = "Save job",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [clientSelection, setClientSelection] = useState<string>(
    job?.client_id ?? defaultClientId ?? "",
  );
  const creatingClient = clientSelection === NEW_CLIENT_VALUE;

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
              value={clientSelection}
              onChange={(e) => setClientSelection(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select a client…
              </option>
              <option value={NEW_CLIENT_VALUE}>+ New client</option>
              {clients.length > 0 ? (
                <optgroup label="Existing clients">
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contact_name}
                      {c.company_name ? ` — ${c.company_name}` : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null}
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

          {creatingClient ? (
            <div className="md:col-span-2 rounded-lg border border-gold-500/30 bg-gold-500/5 p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-gold-400" />
                <p className="rw-eyebrow">New client</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-3">
                  <Label htmlFor="new_client_name">Contact name *</Label>
                  <Input
                    id="new_client_name"
                    name="new_client_name"
                    placeholder="Jane Homeowner"
                    required={creatingClient}
                  />
                  <FieldError name="new_client_name" />
                </div>
                <div>
                  <Label htmlFor="new_client_email">Email</Label>
                  <Input
                    id="new_client_email"
                    name="new_client_email"
                    type="email"
                    placeholder="jane@example.com"
                  />
                  <FieldError name="new_client_email" />
                </div>
                <div>
                  <Label htmlFor="new_client_phone">Phone</Label>
                  <Input
                    id="new_client_phone"
                    name="new_client_phone"
                    type="tel"
                    placeholder="(602) 555-0000"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-charcoal-400">
                We&rsquo;ll create the client record when you save the job.
              </p>
            </div>
          ) : null}

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
            <DateField
              id="start_date"
              name="start_date"
              defaultValue={job?.start_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="end_date">Target end date</Label>
            <DateField
              id="end_date"
              name="end_date"
              defaultValue={job?.end_date ?? ""}
            />
          </div>

          <div>
            <Label htmlFor="estimated_value">Estimated value (USD)</Label>
            <MoneyInput
              id="estimated_value"
              name="estimated_value"
              placeholder="0"
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
