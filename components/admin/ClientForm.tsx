"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Client } from "@/lib/types";

interface Props {
  client?: Client | null;
  action: (
    prev: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

export function ClientForm({
  client,
  action,
  cancelHref,
  submitLabel = "Save client",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="contact_name">Contact name *</Label>
            <Input
              id="contact_name"
              name="contact_name"
              defaultValue={client?.contact_name ?? ""}
              required
              autoFocus
            />
            <FieldError name="contact_name" />
          </div>
          <div>
            <Label htmlFor="company_name">Company</Label>
            <Input
              id="company_name"
              name="company_name"
              defaultValue={client?.company_name ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
            />
            <FieldError name="email" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={client?.phone ?? ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              defaultValue={client?.address ?? ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={client?.notes ?? ""}
              rows={4}
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
