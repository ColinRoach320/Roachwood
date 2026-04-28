"use client";

import * as React from "react";
import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { LineItemsEditor } from "@/components/admin/LineItemsEditor";
import { DrawsEditor } from "@/components/admin/DrawsEditor";
import { DateField } from "@/components/admin/DateField";
import { MoneyInput } from "@/components/admin/MoneyInput";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Invoice, InvoiceStatus, InvoiceDraw } from "@/lib/types";

interface JobOption {
  id: string;
  title: string;
  client_name: string | null;
}

interface Props {
  invoice?: Invoice | null;
  /** Existing draws when editing. Empty array = single-payment invoice. */
  existingDraws?: InvoiceDraw[];
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
  existingDraws,
  jobs,
  defaultJobId,
  defaultEstimateId,
  action,
  cancelHref,
  submitLabel = "Save invoice",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  // Live invoice total — driven by LineItemsEditor's onTotalsChange so
  // the draws editor can show real percentages while Colin is still
  // editing line items.
  const [liveTotal, setLiveTotal] = React.useState<number>(
    Number(invoice?.total ?? 0),
  );

  // Payment schedule mode toggle. Initial state: "draws" if existing
  // draws were passed in, otherwise "single".
  const [scheduleMode, setScheduleMode] = React.useState<"single" | "draws">(
    existingDraws && existingDraws.length > 0 ? "draws" : "single",
  );

  const initialDraws =
    existingDraws && existingDraws.length > 0
      ? existingDraws
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((d) => ({
            id: d.id,
            db_id: d.id,
            label: d.label,
            amount: Number(d.amount),
            due_date: d.due_date,
          }))
      : undefined;

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
            <DateField
              id="due_date"
              name="due_date"
              defaultValue={invoice?.due_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="amount_paid">Amount paid (USD)</Label>
            <MoneyInput
              id="amount_paid"
              name="amount_paid"
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
            onTotalsChange={({ total }) => setLiveTotal(total)}
          />
          <FieldError name="line_items" />
        </div>

        {/* Payment schedule */}
        <div className="space-y-3 border-t border-charcoal-700 pt-6">
          <input
            type="hidden"
            name="schedule_mode"
            value={scheduleMode}
          />
          <div>
            <Label>Payment schedule</Label>
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              <ScheduleToggleButton
                active={scheduleMode === "single"}
                onClick={() => setScheduleMode("single")}
                label="Single payment"
                hint="One Pay Now button — paid in full at once."
              />
              <ScheduleToggleButton
                active={scheduleMode === "draws"}
                onClick={() => setScheduleMode("draws")}
                label="Draw schedule"
                hint="Deposit, midpoint, completion, etc."
              />
            </div>
          </div>
          {scheduleMode === "draws" ? (
            <DrawsEditor invoiceTotal={liveTotal} initial={initialDraws} />
          ) : null}
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

function ScheduleToggleButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-lg border border-gold-500 bg-gold-500/10 p-3 text-left transition shadow-gold-glow"
          : "rounded-lg border border-charcoal-700 bg-charcoal-800 p-3 text-left transition hover:border-charcoal-600 hover:bg-charcoal-700"
      }
    >
      <p
        className={
          active
            ? "text-sm font-medium text-gold-300"
            : "text-sm font-medium text-charcoal-100"
        }
      >
        {label}
      </p>
      <p className="mt-0.5 text-xs text-charcoal-400">{hint}</p>
    </button>
  );
}
