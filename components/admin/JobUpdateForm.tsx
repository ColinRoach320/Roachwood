"use client";

import { useActionState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function JobUpdateForm({ action }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the textarea after a successful post so the next note starts blank.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <FormShell state={state} successMessage="Update posted.">
      <form ref={formRef} action={formAction} className="space-y-3">
        <div>
          <Label htmlFor="body">Add an update</Label>
          <Textarea
            id="body"
            name="body"
            rows={3}
            placeholder="What happened today on the site?"
            required
          />
          <FieldError name="body" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-charcoal-300">
            <input
              type="checkbox"
              name="visible_to_client"
              defaultChecked
              className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-900 text-gold-500 focus:ring-gold-500/40"
            />
            Visible to client
          </label>
          <SubmitButton label="Post update" pendingLabel="Posting…" size="sm" />
        </div>
      </form>
    </FormShell>
  );
}
