import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClipboardList, GitBranch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type { ChangeOrder, Estimate, Job } from "@/lib/types";
import {
  decideChangeOrder,
  decideEstimate,
} from "@/app/portal/jobs/[id]/actions";

export default async function PortalApprovalsPage() {
  const supabase = await createClient();

  // RLS scopes both queries to rows on the client's own jobs.
  const [estimatesRes, changeOrdersRes, jobsRes] = await Promise.all([
    supabase
      .from("estimates")
      .select("id, job_id, title, total, status, created_at")
      .eq("status", "sent")
      .order("created_at", { ascending: false }),
    supabase
      .from("change_orders")
      .select("id, job_id, co_number, title, total, status, description, created_at")
      .eq("status", "sent")
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, title"),
  ]);

  const estimates = (estimatesRes.data ?? []) as Pick<
    Estimate,
    "id" | "job_id" | "title" | "total" | "status" | "created_at"
  >[];
  const changeOrders = (changeOrdersRes.data ?? []) as Pick<
    ChangeOrder,
    "id" | "job_id" | "co_number" | "title" | "total" | "status" | "description" | "created_at"
  >[];
  const jobs = (jobsRes.data ?? []) as Pick<Job, "id" | "title">[];
  const jobName = (id: string) =>
    jobs.find((j) => j.id === id)?.title ?? "(project)";

  const total = estimates.length + changeOrders.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Approvals</p>
        <h1 className="rw-display mt-2 text-3xl">Awaiting your decision</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Estimates and scope changes that need a yes or no before work
          continues.
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>No items waiting for approval.</CardTitle>
              <CardDescription>
                You&apos;re all caught up. Anything new will land here.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-3">
          {estimates.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-300">
                    <ClipboardList className="h-3 w-3" /> Estimate
                  </p>
                  <p className="mt-1 truncate text-charcoal-50">{e.title}</p>
                  <p className="text-xs text-charcoal-400">{jobName(e.job_id)}</p>
                  <p className="mt-3 font-display text-xl text-charcoal-50 tabular-nums">
                    {formatMoney(e.total)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                    Sent {formatDate(e.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <form action={decideEstimate} className="flex-1">
                  <input type="hidden" name="estimate_id" value={e.id} />
                  <input type="hidden" name="job_id" value={e.job_id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button
                    type="submit"
                    size="md"
                    className="h-12 w-full bg-emerald-500 text-charcoal-950 hover:bg-emerald-400"
                  >
                    Approve
                  </Button>
                </form>
                <form action={decideEstimate} className="flex-1">
                  <input type="hidden" name="estimate_id" value={e.id} />
                  <input type="hidden" name="job_id" value={e.job_id} />
                  <input type="hidden" name="decision" value="declined" />
                  <Button
                    type="submit"
                    size="md"
                    variant="secondary"
                    className="h-12 w-full"
                  >
                    Decline
                  </Button>
                </form>
              </div>
            </li>
          ))}

          {changeOrders.map((co) => (
            <li
              key={co.id}
              className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-300">
                  <GitBranch className="h-3 w-3" /> Change order · CO-{co.co_number}
                </p>
                <p className="mt-1 truncate text-charcoal-50">{co.title}</p>
                <p className="text-xs text-charcoal-400">{jobName(co.job_id)}</p>
                {co.description ? (
                  <p className="mt-2 text-sm text-charcoal-300 leading-relaxed">
                    {co.description}
                  </p>
                ) : null}
                <p className="mt-3 font-display text-xl text-charcoal-50 tabular-nums">
                  {formatMoney(co.total)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                  Sent {formatDate(co.created_at)}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <form action={decideChangeOrder} className="flex-1">
                  <input type="hidden" name="change_order_id" value={co.id} />
                  <input type="hidden" name="job_id" value={co.job_id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button
                    type="submit"
                    size="md"
                    className="h-12 w-full bg-emerald-500 text-charcoal-950 hover:bg-emerald-400"
                  >
                    Approve
                  </Button>
                </form>
                <form action={decideChangeOrder} className="flex-1">
                  <input type="hidden" name="change_order_id" value={co.id} />
                  <input type="hidden" name="job_id" value={co.job_id} />
                  <input type="hidden" name="decision" value="declined" />
                  <Button
                    type="submit"
                    size="md"
                    variant="secondary"
                    className="h-12 w-full"
                  >
                    Decline
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
