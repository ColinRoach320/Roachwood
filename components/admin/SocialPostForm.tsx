"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { SocialPost } from "@/lib/types";

interface JobOption {
  id: string;
  title: string;
}

interface Props {
  post?: SocialPost | null;
  jobs: JobOption[];
  defaultJobId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function SocialPostForm({
  post,
  jobs,
  defaultJobId,
  action,
  cancelHref,
  submitLabel = "Save draft",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="platform">Platform *</Label>
            <select
              id="platform"
              name="platform"
              defaultValue={post?.platform ?? "instagram"}
              required
              className={inputClass}
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="houzz">Houzz</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={post?.status ?? "draft"}
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="job_id">Project (optional)</Label>
            <select
              id="job_id"
              name="job_id"
              defaultValue={post?.job_id ?? defaultJobId ?? ""}
              className={inputClass}
            >
              <option value="">— No project link —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="file">
              Photo {post ? "(leave empty to keep current)" : "(optional)"}
            </Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-charcoal-200 file:mr-4 file:rounded-md file:border-0 file:bg-charcoal-700 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-charcoal-100 hover:file:bg-charcoal-600"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="caption">Caption *</Label>
            <Textarea
              id="caption"
              name="caption"
              defaultValue={post?.caption ?? ""}
              rows={5}
              required
              autoFocus={!post}
              placeholder="Write the post copy…"
            />
            <FieldError name="caption" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              name="hashtags"
              defaultValue={post?.hashtags ?? ""}
              placeholder="#scottsdaledesign #customcabinetry #azhomes"
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
