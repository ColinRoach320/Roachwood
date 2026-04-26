import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { JobStatusBadge, ApprovalStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Job, JobUpdate, Approval } from "@/lib/types";
import { decideApproval } from "./actions";

export default async function ClientJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) notFound();
  const j = job as Job;

  const [updatesRes, approvalsRes] = await Promise.all([
    supabase
      .from("job_updates")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const updates = (updatesRes.data ?? []) as JobUpdate[];
  const approvals = (approvalsRes.data ?? []) as Approval[];

  return (
    <div className="space-y-10">
      <div>
        <p className="rw-eyebrow">Project</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rw-display text-3xl">{j.title}</h1>
          <JobStatusBadge status={j.status} />
        </div>
        {j.description ? (
          <p className="mt-3 max-w-2xl text-sm text-charcoal-300 leading-relaxed">
            {j.description}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Approvals</CardTitle>
              <CardDescription>Decisions we need from you to keep moving.</CardDescription>
            </div>
          </CardHeader>
          {approvals.length === 0 ? (
            <p className="text-sm text-charcoal-400">No approvals on file.</p>
          ) : (
            <ul className="space-y-3">
              {approvals.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-charcoal-700 bg-charcoal-900/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-charcoal-100">{a.title}</p>
                      {a.description ? (
                        <p className="mt-1 text-sm text-charcoal-300">{a.description}</p>
                      ) : null}
                      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                        Requested {formatDate(a.created_at)}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={a.status} />
                  </div>

                  {a.status === "pending" ? (
                    <div className="mt-4 flex gap-2">
                      <form action={decideApproval}>
                        <input type="hidden" name="approval_id" value={a.id} />
                        <input type="hidden" name="job_id" value={j.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <Button type="submit" size="sm">Approve</Button>
                      </form>
                      <form action={decideApproval}>
                        <input type="hidden" name="approval_id" value={a.id} />
                        <input type="hidden" name="job_id" value={j.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <Button type="submit" size="sm" variant="secondary">Decline</Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Project details</CardTitle>
            </div>
          </CardHeader>
          <dl className="grid grid-cols-1 gap-4 text-sm">
            <Detail label="Start" value={formatDate(j.start_date)} />
            <Detail label="Target completion" value={formatDate(j.end_date)} />
            <Detail label="Address" value={j.address ?? "—"} />
          </dl>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Project log</CardTitle>
            <CardDescription>Latest updates from the workshop.</CardDescription>
          </div>
        </CardHeader>
        {updates.length === 0 ? (
          <p className="text-sm text-charcoal-400">No updates yet.</p>
        ) : (
          <ol className="relative space-y-6 border-l border-charcoal-700 pl-6">
            {updates.map((u) => (
              <li key={u.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-2 w-2 rounded-full bg-gold-500" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                  {formatDate(u.created_at)}
                </p>
                <p className="mt-1 text-sm text-charcoal-100 leading-relaxed">{u.body}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="rw-eyebrow">{label}</dt>
      <dd className="mt-1 text-charcoal-100">{value}</dd>
    </div>
  );
}
