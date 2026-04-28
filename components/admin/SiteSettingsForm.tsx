"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";
import type { SiteSettings } from "@/lib/types";

interface Props {
  settings: SiteSettings;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function SiteSettingsForm({ settings, action }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="phone">Direct line</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={settings.phone ?? ""}
              placeholder="(602) 555-0000"
            />
            <p className="mt-1 text-xs text-charcoal-500">
              Shown in the contact section.
            </p>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={settings.email ?? ""}
              placeholder="info@roachwood.co"
            />
            <FieldError name="email" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="service_area">Service area</Label>
            <Input
              id="service_area"
              name="service_area"
              defaultValue={settings.service_area ?? ""}
              placeholder="Scottsdale & Greater Phoenix Area"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Textarea
              id="tagline"
              name="tagline"
              defaultValue={settings.tagline ?? ""}
              rows={2}
              placeholder="Built right. Made to last."
            />
            <p className="mt-1 text-xs text-charcoal-500">
              Currently used on the home page hero.
            </p>
          </div>
        </div>

        <div className="border-t border-charcoal-700 pt-6">
          <p className="rw-eyebrow">Reviews &amp; social</p>
          <p className="mt-2 max-w-xl text-sm text-charcoal-400">
            Set these once. The job-complete email and the marketing
            footer pull from here automatically.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="google_review_url">Google review URL</Label>
              <Input
                id="google_review_url"
                name="google_review_url"
                type="url"
                defaultValue={settings.google_review_url ?? ""}
                placeholder="https://g.page/r/..."
              />
              <FieldError name="google_review_url" />
              <p className="mt-1 text-xs text-charcoal-500">
                From Google Business Profile → Get more reviews.
              </p>
            </div>
            <div>
              <Label htmlFor="houzz_url">Houzz profile URL</Label>
              <Input
                id="houzz_url"
                name="houzz_url"
                type="url"
                defaultValue={settings.houzz_url ?? ""}
                placeholder="https://www.houzz.com/pro/..."
              />
              <FieldError name="houzz_url" />
            </div>
            <div>
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                name="instagram_url"
                type="url"
                defaultValue={settings.instagram_url ?? ""}
                placeholder="https://instagram.com/roachwood..."
              />
              <FieldError name="instagram_url" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-charcoal-700 pt-5">
          <SubmitButton label="Save settings" pendingLabel="Saving…" />
        </div>
      </form>
    </FormShell>
  );
}
