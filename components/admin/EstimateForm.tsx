"use client";

import { useActionState, useState } from "react";
import { UserPlus, FolderPlus } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { LineItemsEditor } from "@/components/admin/LineItemsEditor";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Estimate, EstimateStatus, Client } from "@/lib/types";

interface JobOption {
  id: string;
  title: string;
  client_id: string;
  client_name: string | null;
}

interface Props {
  estimate?: Estimate | null;
  jobs: JobOption[];
  clients: Pick<Client, "id" | "contact_name" | "company_name">[];
  defaultJobId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const STATUS_OPTIONS: { value: EstimateStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "no_response", label: "No response" },
];

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

// Mirrors the sentinel in app/admin/estimates/actions.ts. Server-side
// the action treats these specially and creates a row before inserting
// the estimate.
const NEW_CLIENT = "__new_client__";
const NEW_JOB = "__new_job__";

// US states + DC. AZ is pre-selected because that's where ~90% of work
// happens; Colin can change it for the occasional out-of-state job.
const US_STATES: { value: string; label: string }[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export function EstimateForm({
  estimate,
  jobs,
  clients,
  defaultJobId,
  action,
  cancelHref,
  submitLabel = "Save estimate",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [clientSelection, setClientSelection] = useState<string>("");
  const [jobSelection, setJobSelection] = useState<string>(
    estimate?.job_id ?? defaultJobId ?? "",
  );
  const creatingClient = clientSelection === NEW_CLIENT;
  const creatingJob = jobSelection === NEW_JOB;

  // When the user picks "+ New client", a brand-new client can't have an
  // existing project — so force the project picker to "+ New project"
  // too. Doing this here (rather than disabling the select) keeps the
  // value submitted by the form; disabled <select> elements drop out of
  // FormData entirely, which was breaking the cascade.
  function handleClientChange(next: string) {
    setClientSelection(next);
    if (next === NEW_CLIENT) {
      setJobSelection(NEW_JOB);
    } else if (jobSelection === NEW_JOB) {
      // Switching back to an existing client clears the auto-pick so
      // the user can choose an existing project for them.
      setJobSelection("");
    }
  }

  // When editing, the existing job is locked (the estimate already
  // points at one); we don't expose the inline-create paths in that
  // case so the cascade can't accidentally fire.
  const isEdit = !!estimate;

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          {isEdit ? (
            <div className="md:col-span-2">
              <Label htmlFor="title">Estimate description</Label>
              <Input
                id="title"
                name="title"
                defaultValue={estimate?.title ?? ""}
                placeholder="e.g. Initial bid, revision after walkthrough"
              />
              <FieldError name="title" />
              <p className="mt-1 text-xs text-charcoal-500">
                Optional — shows in the estimate list and on the PDF. Defaults
                to the project name when blank.
              </p>
            </div>
          ) : (
            // On new, the project name doubles as the estimate title so
            // Colin only types it once. The action fills it server-side.
            <input type="hidden" name="title" value="" />
          )}

          {!isEdit ? (
            <>
              {/* Client picker — drives the project picker below. */}
              <div>
                <Label htmlFor="client_id">Client *</Label>
                <select
                  id="client_id"
                  name="client_id"
                  value={clientSelection}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Existing client (pick a project) …</option>
                  <option value={NEW_CLIENT}>+ New client</option>
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
                <Label htmlFor="job_id">Project *</Label>
                <select
                  id="job_id"
                  name="job_id"
                  value={jobSelection}
                  onChange={(e) => setJobSelection(e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a project…
                  </option>
                  <option value={NEW_JOB}>+ New project</option>
                  {jobs.length > 0 ? (
                    <optgroup label="Existing projects">
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                          {j.client_name ? ` — ${j.client_name}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                <FieldError name="job_id" />
                {creatingClient ? (
                  <p className="mt-1 text-xs text-charcoal-500">
                    A new project will be created for this client.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <Label htmlFor="job_id">Project</Label>
              <Input
                value={
                  jobs.find((j) => j.id === estimate.job_id)?.title ??
                  "(linked project)"
                }
                disabled
              />
              <input type="hidden" name="job_id" value={estimate.job_id} />
            </div>
          )}

          {isEdit ? (
            <div className="md:col-span-2">
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
          ) : (
            // New estimates always start in draft. Status changes happen
            // from the detail page after save (Mark sent / Won / Lost).
            <input type="hidden" name="status" value="draft" />
          )}

          {creatingClient && !isEdit ? (
            <div className="md:col-span-2 rounded-lg border border-gold-500/30 bg-gold-500/5 p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-gold-400" />
                <p className="rw-eyebrow">New client</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="new_client_name">Contact name *</Label>
                  <Input
                    id="new_client_name"
                    name="new_client_name"
                    placeholder="John Smith"
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
                    placeholder="john@email.com"
                  />
                  <FieldError name="new_client_email" />
                </div>
                <div>
                  <Label htmlFor="new_client_phone">Phone</Label>
                  <Input
                    id="new_client_phone"
                    name="new_client_phone"
                    type="tel"
                    placeholder="(480) 555-0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="new_client_street">Street address</Label>
                  <Input
                    id="new_client_street"
                    name="new_client_street"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="new_client_city">City</Label>
                  <Input
                    id="new_client_city"
                    name="new_client_city"
                    defaultValue="Scottsdale"
                  />
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-3">
                  <div>
                    <Label htmlFor="new_client_state">State</Label>
                    <select
                      id="new_client_state"
                      name="new_client_state"
                      defaultValue="AZ"
                      className={inputClass}
                    >
                      {US_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="new_client_zip">ZIP</Label>
                    <Input
                      id="new_client_zip"
                      name="new_client_zip"
                      placeholder="85251"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-charcoal-400">
                Client + project records save when you save the estimate —
                even if the bid doesn&rsquo;t win.
              </p>
            </div>
          ) : null}

          {(creatingJob || creatingClient) && !isEdit ? (
            <div className="md:col-span-2 rounded-lg border border-gold-500/30 bg-gold-500/5 p-5">
              <div className="mb-4 flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-gold-400" />
                <p className="rw-eyebrow">New project</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="new_job_title">Project name *</Label>
                  <Input
                    id="new_job_title"
                    name="new_job_title"
                    placeholder="Kitchen remodel, Deck build, Master bath"
                    required={creatingJob || creatingClient}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="new_job_address">Site address</Label>
                  <Input
                    id="new_job_address"
                    name="new_job_address"
                    placeholder="123 Main St"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-charcoal-400">
                Starts in <strong>lead</strong> status. Flips to{" "}
                <strong>active</strong> automatically when the estimate is
                marked won.
              </p>
            </div>
          ) : null}
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
