"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { GalleryItem } from "@/lib/types";

interface Props {
  item?: GalleryItem | null;
  currentImageUrl?: string | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  submitLabel?: string;
}

const inputClass =
  "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-charcoal-50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition";

export function GalleryForm({
  item,
  currentImageUrl,
  action,
  cancelHref,
  submitLabel = "Save photo",
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="file">
              Photo {item ? "(leave empty to keep current)" : "*"}
            </Label>
            {currentImageUrl ? (
              <div className="mb-3 overflow-hidden rounded-md border border-charcoal-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImageUrl}
                  alt="Current"
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*"
              required={!item}
              className="block w-full text-sm text-charcoal-200 file:mr-4 file:rounded-md file:border-0 file:bg-charcoal-700 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-charcoal-100 hover:file:bg-charcoal-600"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={item?.title ?? ""}
              placeholder="Walnut kitchen — Paradise Valley"
              required
              autoFocus={!item}
            />
            <FieldError name="title" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description ?? ""}
              rows={3}
              placeholder="Optional caption shown on the public site."
            />
          </div>

          <div>
            <Label htmlFor="service_type">Service tag</Label>
            <select
              id="service_type"
              name="service_type"
              defaultValue={item?.service_type ?? ""}
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
              defaultValue={item?.sort_order ?? 0}
            />
            <p className="mt-1 text-xs text-charcoal-500">
              Lower numbers appear first.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-charcoal-200">
              <input
                type="checkbox"
                name="visible"
                defaultChecked={item?.visible ?? true}
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
