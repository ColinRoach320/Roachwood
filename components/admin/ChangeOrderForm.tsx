"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { LineItemsEditor } from "@/components/admin/LineItemsEditor";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { ChangeOrder } from "@/lib/types";

interface Props {
  changeOrder?: ChangeOrder | null;
  /** When creating, the job is fixed via this id (no picker). */
  jobId: string;
  jobTitle: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

export function ChangeOrderForm({
  changeOrder,
  jobId,
  jobTitle,
  action,
  cancelHref,
  submitLabel = "Save change order",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const isEdit = !!changeOrder;

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        {/* Job is fixed for change orders — they always belong to the
            job they were initiated from. */}
        <input type="hidden" name="job_id" value={jobId} />
        {/* New change orders always start in draft; transitions happen
            from the detail page. */}
        {!isEdit ? (
          <input type="hidden" name="status" value="draft" />
        ) : null}

        <div className="rounded-md border border-charcoal-700 bg-charcoal-900/40 px-4 py-3 text-sm text-charcoal-300">
          <span className="text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
            Job
          </span>
          <span className="ml-2 text-charcoal-100">{jobTitle}</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={changeOrder?.title ?? ""}
              placeholder="Added outdoor lighting"
              required
              autoFocus={!isEdit}
            />
            <FieldError name="title" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={changeOrder?.description ?? ""}
              rows={3}
              placeholder="What changed and why — context the client should see."
            />
          </div>
        </div>

        <div>
          <Label>Line items</Label>
          <LineItemsEditor
            initial={changeOrder?.line_items ?? []}
            initialTaxRate={changeOrder?.tax_rate ?? 0}
          />
          <FieldError name="line_items" />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={changeOrder?.notes ?? ""}
            rows={3}
            placeholder="Internal notes (won't show on the PDF unless you want them to)."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-charcoal-700 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <ButtonLink
            href={cancelHref}
            variant="ghost"
            className="w-full justify-center sm:w-auto"
          >
            Cancel
          </ButtonLink>
          <SubmitButton
            label={submitLabel}
            pendingLabel="Saving…"
            size="lg"
            className="w-full justify-center sm:w-auto"
          />
        </div>
      </form>
    </FormShell>
  );
}
