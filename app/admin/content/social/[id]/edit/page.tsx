import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SocialPostForm } from "@/components/admin/SocialPostForm";
import { createClient } from "@/lib/supabase/server";
import { updateSocialPost } from "../../actions";
import type { SocialPost, Job } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSocialPostPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle<SocialPost>();

  if (!post) notFound();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("created_at", { ascending: false });

  const action = updateSocialPost.bind(null, id);

  return (
    <Card>
      <SocialPostForm
        post={post}
        jobs={(jobs ?? []) as Pick<Job, "id" | "title">[]}
        action={action}
        cancelHref="/admin/content/social"
        submitLabel="Save changes"
      />
    </Card>
  );
}
