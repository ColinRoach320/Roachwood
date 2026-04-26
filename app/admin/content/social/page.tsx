import Link from "next/link";
import { Plus, Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Badge } from "@/components/ui/Badge";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { SocialRowActions } from "@/components/admin/SocialRowActions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { SocialPost, Job } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Drafts" },
  { value: "posted", label: "Posted" },
];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SocialPostsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: posts } = await query;

  const list = (posts ?? []) as SocialPost[];
  const jobIds = Array.from(
    new Set(list.map((p) => p.job_id).filter((x): x is string => !!x)),
  );
  const { data: jobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title").in("id", jobIds)
    : { data: [] };
  const jobMap = new Map(
    (jobs ?? []).map((j: Pick<Job, "id" | "title">) => [j.id, j]),
  );

  const drafts = list.filter((p) => p.status === "draft").length;
  const posted = list.filter((p) => p.status === "posted").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-charcoal-400">
          {drafts} draft{drafts === 1 ? "" : "s"} · {posted} posted.
        </p>
        <ButtonLink href="/admin/content/social/new">
          <Plus className="h-4 w-4" /> New post draft
        </ButtonLink>
      </div>

      <StatusFilter param="status" options={STATUS_OPTIONS} />

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>No posts yet</CardTitle>
              <CardDescription>
                Draft posts here so they&rsquo;re ready to copy into Instagram,
                Facebook, or Houzz when the work&rsquo;s done.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => {
            const job = p.job_id ? jobMap.get(p.job_id) : null;
            return (
              <article key={p.id} className="rw-card flex gap-4 p-5">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-900 flex items-center justify-center">
                  {p.storage_path ? (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
                      Photo attached
                    </span>
                  ) : (
                    <ImageIcon className="h-6 w-6 text-charcoal-600" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gold-400">
                        {p.platform}
                      </p>
                      {job ? (
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="text-xs text-charcoal-400 hover:text-gold-400"
                        >
                          {job.title}
                        </Link>
                      ) : null}
                    </div>
                    {p.status === "posted" ? (
                      <Badge tone="green">Posted</Badge>
                    ) : (
                      <Badge tone="amber">Draft</Badge>
                    )}
                  </div>
                  <p className="text-sm text-charcoal-100 leading-relaxed line-clamp-3">
                    {p.caption}
                  </p>
                  {p.hashtags ? (
                    <p className="text-xs text-gold-400/80 leading-relaxed line-clamp-1">
                      {p.hashtags}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between border-t border-charcoal-700 pt-2 text-[11px] uppercase tracking-[0.16em]">
                    <span className="text-charcoal-500">
                      {p.posted_at
                        ? `Posted ${formatDate(p.posted_at)}`
                        : `Created ${formatDate(p.created_at)}`}
                    </span>
                    <SocialRowActions
                      id={p.id}
                      status={p.status}
                      storagePath={p.storage_path}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
