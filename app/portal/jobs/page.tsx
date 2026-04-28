import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Job } from "@/lib/types";

export default async function ClientJobsPage() {
  // RLS scopes the SELECT to the rows where the client's profile_id
  // matches auth.uid(), so a plain `*` is the right query here — the
  // database does the filtering.
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (jobs ?? []) as Job[];

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Projects</p>
        <h1 className="rw-display mt-2 text-3xl">Your projects</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Tap a project to see updates, approvals, photos, and documents.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>No projects yet</CardTitle>
              <CardDescription>
                Your contractor will add your project here.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((j) => (
            <Link
              key={j.id}
              href={`/portal/jobs/${j.id}`}
              className="group block"
            >
              <Card className="transition group-hover:border-gold-500/40">
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="truncate transition group-hover:text-gold-400">
                      {j.title}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {j.address ?? "Project location"}
                    </CardDescription>
                  </div>
                  <JobStatusBadge status={j.status} />
                </CardHeader>
                <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                  <div>
                    <p className="rw-eyebrow">Start</p>
                    <p className="mt-1 text-charcoal-200">
                      {formatDate(j.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="rw-eyebrow">Target</p>
                    <p className="mt-1 text-charcoal-200">
                      {formatDate(j.end_date)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
