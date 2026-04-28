"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TradePicker } from "@/components/admin/TradePicker";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Subcontractor } from "@/lib/types";

interface Props {
  sub?: Subcontractor | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

export function SubcontractorForm({
  sub,
  action,
  cancelHref,
  submitLabel = "Save subcontractor",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div>
          <Label>Trade *</Label>
          <TradePicker defaultValue={sub?.trade ?? ""} />
          <FieldError name="trade" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="contact_name">Contact name *</Label>
            <Input
              id="contact_name"
              name="contact_name"
              defaultValue={sub?.contact_name ?? ""}
              required
            />
            <FieldError name="contact_name" />
          </div>
          <div>
            <Label htmlFor="company_name">Company</Label>
            <Input
              id="company_name"
              name="company_name"
              defaultValue={sub?.company_name ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={sub?.email ?? ""}
            />
            <FieldError name="email" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={sub?.phone ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="rate_type">Rate type</Label>
            <select
              id="rate_type"
              name="rate_type"
              defaultValue={sub?.rate_type ?? "hourly"}
              className="rw-input"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="project">Per project</option>
            </select>
          </div>
          <div>
            <Label htmlFor="rate">Rate (USD)</Label>
            <Input
              id="rate"
              name="rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={sub?.rate ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="tax_id">Tax ID (EIN or SSN)</Label>
            <Input
              id="tax_id"
              name="tax_id"
              defaultValue={sub?.tax_id ?? ""}
              placeholder="XX-XXXXXXX"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2 text-sm text-charcoal-200">
              <input
                type="checkbox"
                name="w9_on_file"
                defaultChecked={sub?.w9_on_file ?? false}
                className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-900 text-gold-500 focus:ring-gold-500/40"
              />
              W-9 on file
            </label>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={sub?.notes ?? ""}
              rows={3}
              placeholder="License #, insurance expiry, anything to remember…"
            />
          </div>
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
