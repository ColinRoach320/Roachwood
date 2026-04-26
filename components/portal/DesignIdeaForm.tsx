"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

/**
 * Inline form for clients to share a design inspiration. Either upload a
 * photo or paste a URL — both are saved to the design_ideas row.
 */
export function DesignIdeaForm({ action }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <FormShell state={state}>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="e.g. Walnut shaker doors" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="file">Upload photo</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-charcoal-200 file:mr-4 file:rounded-md file:border-0 file:bg-charcoal-700 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-charcoal-100 hover:file:bg-charcoal-600"
            />
          </div>
          <div>
            <Label htmlFor="image_url">…or paste an image URL</Label>
            <Input
              id="image_url"
              name="image_url"
              type="url"
              placeholder="https://…"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="What stood out — colors, finishes, layout…"
          />
          <FieldError name="notes" />
        </div>

        <div className="flex justify-end">
          <SubmitButton label="Add idea" pendingLabel="Saving…" size="sm" />
        </div>

        <p className="text-xs text-charcoal-500">
          <Plus className="inline h-3 w-3" /> These are visible to Colin so he
          can reference them on the build.
        </p>
      </form>
    </FormShell>
  );
}
