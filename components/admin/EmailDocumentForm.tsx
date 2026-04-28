"use client";

import * as React from "react";
import { useActionState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface Props {
  /** Bound server action (id is already partial-applied). */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** "invoice" | "estimate" — drives the button label only. */
  documentLabel: string;
  defaultTo: string;
  defaultSubject: string;
  defaultMessage: string;
}

export function EmailDocumentForm({
  action,
  documentLabel,
  defaultTo,
  defaultSubject,
  defaultMessage,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(action, initialActionState);

  // Collapse the form on successful send. FormShell handles the toast.
  const lastOk = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !lastOk.current) {
      lastOk.current = true;
      setOpen(false);
    }
    if (!state.ok) lastOk.current = false;
  }, [state.ok]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={() => setOpen(true)}
        className="w-full justify-center sm:w-auto"
      >
        <Mail className="h-4 w-4" /> Email {documentLabel}
      </Button>
    );
  }

  return (
    <div className="rw-card w-full p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-charcoal-50">
          Email {documentLabel}
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-charcoal-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <FormShell state={state}>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              name="to"
              type="email"
              defaultValue={defaultTo}
              required
            />
            <FieldError name="to" />
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              defaultValue={defaultSubject}
              required
            />
            <FieldError name="subject" />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              defaultValue={defaultMessage}
              rows={4}
            />
            <p className="mt-1 text-xs text-charcoal-500">
              The PDF will be attached automatically.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-charcoal-700 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="w-full justify-center sm:w-auto"
            >
              Cancel
            </Button>
            <SubmitButton
              label={`Send ${documentLabel}`}
              pendingLabel="Sending…"
              size="lg"
              className="w-full justify-center sm:w-auto"
            />
          </div>
        </form>
      </FormShell>
    </div>
  );
}
