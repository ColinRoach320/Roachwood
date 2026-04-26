"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface JobOption {
  id: string;
  title: string;
}

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  jobs: JobOption[];
  defaultJobId?: string;
}

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function UploadDocumentForm({ action, jobs, defaultJobId }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <FormShell state={state}>
      <form ref={formRef} action={formAction} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="file">File *</Label>
          <input
            id="file"
            name="file"
            type="file"
            required
            className="block w-full text-sm text-charcoal-200 file:mr-4 file:rounded-md file:border-0 file:bg-charcoal-700 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-charcoal-100 hover:file:bg-charcoal-600"
          />
          <FieldError name="file" />
        </div>

        <div>
          <Label htmlFor="job_id">Attach to job</Label>
          <select
            id="job_id"
            name="job_id"
            defaultValue={defaultJobId ?? ""}
            className={inputClass}
          >
            <option value="">— No job —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="name">Display name (optional)</Label>
          <Input id="name" name="name" placeholder="Defaults to file name" />
        </div>

        <div className="md:col-span-2 flex items-center justify-between gap-3 border-t border-charcoal-700 pt-4">
          <label className="flex items-center gap-2 text-xs text-charcoal-300">
            <input
              type="checkbox"
              name="visible_to_client"
              defaultChecked
              className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-900 text-gold-500 focus:ring-gold-500/40"
            />
            Visible to client
          </label>
          <SubmitButton label="Upload" pendingLabel="Uploading…" />
        </div>
      </form>
    </FormShell>
  );
}
