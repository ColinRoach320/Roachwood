import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Job, Approval } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export default async function ClientHomePage({ searchParams }: PageProps) {
  const { welcome } = await searchParams;
  const isFirstVisit = welcome === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single<{ full_name: string | null; email: string | null }>()
    : { data: null };
  const firstName =
    profile?.full_name?.split(" ")[0]?.trim() ||
    profile?.email?.split("@")[0] ||
    "there";

  const [jobsRes, approvalsRes] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("approvals").select("*").eq("status", "pending"),
  ]);

  const jobs = (jobsRes.data ?? []) as Job[];
  const approvals = (approvalsRes.data ?? []) as Approval[];

  return (
    <div className="space-y-10">
      {isFirstVisit ? (
        <div className="rounded-xl border border-gold-500/40 bg-gold-500/5 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
            <div>
              <p className="rw-eyebrow text-gold-400">Welcome aboard</p>
              <h1 className="rw-display mt-2 text-2xl sm:text-3xl">
                Welcome to your Roachwood project portal, {firstName}.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-charcoal-200">
                Your project is ready to view below. Approvals, payments,
                documents, and progress photos all live here — bookmark
                this page so you can come back any time.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="rw-eyebrow">Welcome</p>
          <h1 className="rw-display mt-2 text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-2 text-sm text-charcoal-400 max-w-xl">
            Track progress, review approvals, and download documents for every
            project we&apos;re running together.
          </p>
        </div>
      )}

      {approvals.length > 0 ? (
        <Card className="border-gold-500/40">
          <CardHeader>
            <div>
              <CardTitle className="text-gold-300">Awaiting your approval</CardTitle>
              <CardDescription>
                {approvals.length} item{approvals.length === 1 ? "" : "s"} need a decision.
              </CardDescription>
            </div>
          </CardHeader>
          <ul className="divide-y divide-charcoal-700">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-charcoal-100">{a.title}</p>
                  <p className="text-xs text-charcoal-400">{formatDate(a.created_at)}</p>
                </div>
                <Link
                  href={`/portal/jobs/${a.job_id}`}
                  className="text-xs uppercase tracking-[0.18em] text-gold-400 hover:text-gold-300 transition"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.length === 0 ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>No projects yet</CardTitle>
                <CardDescription>
                  Once we kick off your project, it will appear here.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : (
          jobs.map((j) => (
            <Link key={j.id} href={`/portal/jobs/${j.id}`} className="block group">
              <Card className="group-hover:border-gold-500/40 transition">
                <CardHeader>
                  <div>
                    <CardTitle className="group-hover:text-gold-400 transition">{j.title}</CardTitle>
                    <CardDescription>
                      {j.address ?? "Project location"}
                    </CardDescription>
                  </div>
                  <JobStatusBadge status={j.status} />
                </CardHeader>
                <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                  <div>
                    <p className="rw-eyebrow">Start</p>
                    <p className="mt-1 text-charcoal-200">{formatDate(j.start_date)}</p>
                  </div>
                  <div>
                    <p className="rw-eyebrow">Target</p>
                    <p className="mt-1 text-charcoal-200">{formatDate(j.end_date)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
