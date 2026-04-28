import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { createClient } from "@/lib/supabase/server";
import { updateSiteSettings } from "./actions";
import type { SiteSettings } from "@/lib/types";

export default async function SiteSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<SiteSettings>();

  // Fall back to a sensible default shape if the singleton row is missing
  // (it's seeded by 0004_content.sql, but be defensive).
  const settings: SiteSettings = data ?? {
    id: 1,
    phone: null,
    email: null,
    service_area: null,
    tagline: null,
    google_review_url: null,
    houzz_url: null,
    instagram_url: null,
    updated_at: new Date().toISOString(),
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Public site contact</CardTitle>
          <CardDescription>
            Edit the phone, email, service area, and hero tagline shown on
            the marketing site. Changes go live the next time visitors load
            the page.
          </CardDescription>
        </div>
      </CardHeader>
      <SiteSettingsForm settings={settings} action={updateSiteSettings} />
    </Card>
  );
}
