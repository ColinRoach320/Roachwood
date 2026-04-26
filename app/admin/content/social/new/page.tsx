import { Card } from "@/components/ui/Card";
import { SocialPostForm } from "@/components/admin/SocialPostForm";
import { createClient } from "@/lib/supabase/server";
import { createSocialPost } from "../actions";
import type { Job } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ job_id?: string }>;
}

export default async function NewSocialPostPage({ searchParams }: PageProps) {
  const { job_id } = await searchParams;
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <Card>
      <SocialPostForm
        jobs={(jobs ?? []) as Pick<Job, "id" | "title">[]}
        defaultJobId={job_id}
        action={createSocialPost}
        cancelHref="/admin/content/social"
        submitLabel="Save draft"
      />
    </Card>
  );
}
