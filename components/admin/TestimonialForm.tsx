"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { Testimonial } from "@/lib/types";

interface Props {
  testimonial?: Testimonial | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function TestimonialForm({
  testimonial,
  action,
  cancelHref,
  submitLabel = "Save testimonial",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="client_name">Client name *</Label>
            <Input
              id="client_name"
              name="client_name"
              defaultValue={testimonial?.client_name ?? ""}
              placeholder="Michael & Sarah T."
              required
              autoFocus
            />
            <FieldError name="client_name" />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={testimonial?.location ?? ""}
              placeholder="Scottsdale, AZ"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="quote">Quote *</Label>
            <Textarea
              id="quote"
              name="quote"
              defaultValue={testimonial?.quote ?? ""}
              rows={4}
              placeholder="What the client said about the work…"
              required
            />
            <FieldError name="quote" />
          </div>

          <div>
            <Label htmlFor="star_rating">Star rating</Label>
            <select
              id="star_rating"
              name="star_rating"
              defaultValue={testimonial?.star_rating ?? 5}
              className={inputClass}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                  {"☆".repeat(5 - n)} ({n})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="project_type">Project type</Label>
            <select
              id="project_type"
              name="project_type"
              defaultValue={testimonial?.project_type ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="kitchen">Custom Kitchen</option>
              <option value="cabinetry">Cabinetry / Built-ins</option>
              <option value="deck">Deck / Outdoor</option>
              <option value="interior">Interior Renovation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="sort_order">Sort order</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              step="1"
              defaultValue={testimonial?.sort_order ?? 0}
            />
            <p className="mt-1 text-xs text-charcoal-500">
              Lower numbers appear first.
            </p>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-charcoal-200">
              <input
                type="checkbox"
                name="visible"
                defaultChecked={testimonial?.visible ?? true}
                className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-900 text-gold-500 focus:ring-gold-500/40"
              />
              Visible on the public site
            </label>
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
