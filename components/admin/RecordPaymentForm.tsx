"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  remaining: number;
}

export function RecordPaymentForm({ action, remaining }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="amount">Record payment (USD)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={remaining > 0 ? remaining : undefined}
            placeholder={remaining > 0 ? remaining.toFixed(2) : "0.00"}
            required
          />
          <FieldError name="amount" />
        </div>
        <SubmitButton label="Record" pendingLabel="Saving…" size="md" />
      </form>
    </FormShell>
  );
}
