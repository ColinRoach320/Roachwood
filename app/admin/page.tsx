import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/Badge";
import { QuickActionsBar } from "@/components/admin/QuickActionsBar";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatMoney } from "@/lib/utils";
import type {
  Job,
  Approval,
  Estimate,
  Invoice,
  JobUpdate,
  Client,
} from "@/lib/types";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    jobsRes,
    pendingApprovalsRes,
    pendingEstimatesRes,
    inFlightEstimatesRes,
    unpaidInvoicesRes,
    recentUpdatesRes,
    pendingChangeOrdersRes,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("id, title, job_id, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("estimates")
      .select("id, title, job_id, total, status, created_at")
      .eq("status", "sent")
      .order("created_at", { ascending: false }),
    // Stat-card count: every bid that's still in flight (draft or sent —
    // not won/lost/no_response). Separate from the "awaiting client"
    // action card above which is sent-only.
    supabase
      .from("estimates")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent"]),
    supabase
      .from("invoices")
      .select("id, title, job_id, total, amount_paid, status, due_date")
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true }),
    supabase
      .from("job_updates")
      .select("id, body, job_id, created_at, visible_to_client")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("change_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent"]),
  ]);

  const jobs = (jobsRes.data ?? []) as Job[];
  const pendingApprovals = (pendingApprovalsRes.data ?? []) as Approval[];
  const pendingEstimates = (pendingEstimatesRes.data ?? []) as Estimate[];
  const inFlightEstimateCount = inFlightEstimatesRes.count ?? 0;
  const pendingChangeOrderCount = pendingChangeOrdersRes.count ?? 0;
  const unpaidInvoices = (unpaidInvoicesRes.data ?? []) as Invoice[];
  const recentUpdates = (recentUpdatesRes.data ?? []) as JobUpdate[];

  const activeJobs = jobs.filter(
    (j) =>
      j.status === "active" ||
      j.status === "approved" ||
      j.status === "in_progress",
  );
  // Pipeline = potential and not-yet-started: leads, quotes,
  // approved-but-not-active. Excludes "active" since work is underway.
  const pipelineValue = jobs.reduce(
    (sum, j) =>
      j.status === "lead" ||
      j.status === "quoted" ||
      j.status === "approved"
        ? sum + (j.estimated_value ?? 0)
        : sum,
    0,
  );
  const outstandingDollars = unpaidInvoices.reduce(
    (s, i) => s + Number(i.total ?? 0) - Number(i.amount_paid ?? 0),
    0,
  );

  // Pull the client rows for any job we'll surface in This Week / Coming
  // Up so the lists show the contact name without an N+1.
  const clientIds = Array.from(
    new Set(jobs.map((j) => j.client_id)),
  );
  const { data: clientsRows } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, contact_name, company_name")
        .in("id", clientIds)
    : { data: [] };
  const clientMap = new Map(
    ((clientsRows ?? []) as Pick<Client, "id" | "contact_name" | "company_name">[]).map(
      (c) => [c.id, c],
    ),
  );

  // Date math anchored to Arizona local time. We compare against the
  // job's start_date which is a plain `date` column — string compare on
  // ISO YYYY-MM-DD is correct because all values share the same shape.
  const todayPhoenix = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" }),
  );
  const todayIso = todayPhoenix.toISOString().slice(0, 10);
  const sevenDays = new Date(todayPhoenix);
  sevenDays.setDate(sevenDays.getDate() + 7);
  const sevenIso = sevenDays.toISOString().slice(0, 10);
  const thirtyDays = new Date(todayPhoenix);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const thirtyIso = thirtyDays.toISOString().slice(0, 10);

  const upcoming = jobs
    .filter(
      (j) =>
        j.start_date &&
        j.start_date >= todayIso &&
        j.status !== "cancelled" &&
        j.status !== "completed",
    )
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
  const thisWeek = upcoming.filter((j) => j.start_date! < sevenIso);
  const comingUp = upcoming.filter(
    (j) => j.start_date! >= sevenIso && j.start_date! <= thirtyIso,
  );

  // Arizona doesn't observe DST — always UTC-7. Pin the formatter to
  // America/Phoenix so the dashboard date matches Colin's wall clock
  // even when the server (Vercel) renders in UTC.
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Phoenix",
  });

  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  return (
    <div className="space-y-8">
      {/* Today header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rw-eyebrow">Today</p>
          <h1 className="rw-display mt-2 text-3xl">{today}</h1>
          <p className="mt-1 text-sm text-charcoal-400">Scottsdale, AZ</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-charcoal-300">
          <Stat
            label="Active jobs"
            value={activeJobs.length.toString()}
            href="/admin/jobs?status=active"
          />
          <Stat
            label="Pipeline"
            value={formatCurrency(pipelineValue)}
            href="/admin/jobs?status=lead"
          />
          <Stat
            label="Pending estimates"
            value={inFlightEstimateCount.toString()}
            href="/admin/estimates?status=sent"
          />
          <Stat
            label="Pending change orders"
            value={pendingChangeOrderCount.toString()}
            tone={pendingChangeOrderCount > 0 ? "red" : "neutral"}
            href="/admin/jobs"
          />
          <Stat
            label="Outstanding"
            value={formatCurrency(outstandingDollars)}
            tone={outstandingDollars > 0 ? "red" : "neutral"}
            href="/admin/invoices?status=sent"
          />
        </div>
      </div>

      <QuickActionsBar />

      {/* Upcoming schedule — replaces the calendar widget */}
      <section className="grid gap-4 md:grid-cols-2">
        <ScheduleCard
          title="This week"
          subtitle="Jobs starting in the next 7 days."
          jobs={thisWeek}
          clientMap={clientMap}
          empty="No jobs starting this week."
        />
        <ScheduleCard
          title="Coming up"
          subtitle="Jobs starting in the next 30 days."
          jobs={comingUp}
          clientMap={clientMap}
          empty="Nothing scheduled yet."
        />
      </section>

      {/* Outstanding action cards (red) */}
      {(pendingApprovals.length > 0 ||
        pendingEstimates.length > 0 ||
        unpaidInvoices.length > 0) && (
        <section className="grid gap-4 md:grid-cols-3">
          <ActionCard
            title="Pending approvals"
            count={pendingApprovals.length}
            href="/admin/jobs"
            empty="All approvals are resolved."
          >
            {pendingApprovals.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={`/admin/jobs/${a.job_id}`}
                className="block truncate text-sm text-charcoal-100 hover:text-gold-400"
              >
                {a.title}
              </Link>
            ))}
          </ActionCard>
          <ActionCard
            title="Estimates awaiting client"
            count={pendingEstimates.length}
            href="/admin/estimates?status=sent"
            empty="No estimates waiting on a decision."
          >
            {pendingEstimates.slice(0, 3).map((e) => (
              <Link
                key={e.id}
                href={`/admin/estimates/${e.id}`}
                className="flex items-center justify-between gap-2 text-sm hover:text-gold-400"
              >
                <span className="truncate text-charcoal-100">{e.title}</span>
                <span className="shrink-0 text-charcoal-400 tabular-nums">
                  {formatMoney(e.total)}
                </span>
              </Link>
            ))}
          </ActionCard>
          <ActionCard
            title="Unpaid invoices"
            count={unpaidInvoices.length}
            href="/admin/invoices?status=sent"
            empty="No outstanding invoices."
          >
            {unpaidInvoices.slice(0, 3).map((i) => {
              const due =
                Number(i.total ?? 0) - Number(i.amount_paid ?? 0);
              return (
                <Link
                  key={i.id}
                  href={`/admin/invoices/${i.id}`}
                  className="flex items-center justify-between gap-2 text-sm hover:text-gold-400"
                >
                  <span className="truncate text-charcoal-100">
                    {i.title}
                  </span>
                  <span className="shrink-0 text-red-300 tabular-nums">
                    {formatMoney(due)}
                  </span>
                </Link>
              );
            })}
          </ActionCard>
        </section>
      )}

      {/* Active jobs */}
      <section>
        <Card className="p-0 overflow-hidden">
          <div className="flex items-end justify-between gap-3 px-6 pt-6">
            <div>
              <CardTitle>Active jobs</CardTitle>
              <CardDescription>
                Tap a job to open the workshop view.
              </CardDescription>
            </div>
            <Link
              href="/admin/jobs"
              className="text-xs uppercase tracking-[0.2em] text-gold-400 hover:text-gold-300"
            >
              See all →
            </Link>
          </div>
          {activeJobs.length === 0 ? (
            <p className="px-6 py-10 text-sm text-charcoal-400">
              No active jobs right now.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-charcoal-700 border-t border-charcoal-700">
              {activeJobs.slice(0, 8).map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/admin/jobs/${j.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-charcoal-700/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-charcoal-100">{j.title}</p>
                      <p className="text-xs text-charcoal-400">
                        {formatDate(j.start_date)}
                        {j.end_date ? ` → ${formatDate(j.end_date)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-charcoal-300 tabular-nums sm:inline">
                        {formatCurrency(j.estimated_value)}
                      </span>
                      <JobStatusBadge status={j.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Activity feed */}
      <section>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Last few notes posted across all jobs.
              </CardDescription>
            </div>
          </CardHeader>
          {recentUpdates.length === 0 ? (
            <p className="text-sm text-charcoal-400">No activity yet.</p>
          ) : (
            <ol className="space-y-4">
              {recentUpdates.map((u) => {
                const job = jobMap.get(u.job_id);
                return (
                  <li
                    key={u.id}
                    className="flex gap-3 border-b border-charcoal-700/60 pb-3 last:border-0"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2 text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-charcoal-500">
                          {formatDate(u.created_at)}
                        </span>
                        {job ? (
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            className="text-gold-400 hover:text-gold-300"
                          >
                            {job.title}
                          </Link>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-charcoal-100 line-clamp-2">
                        {u.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "red";
  href?: string;
}) {
  const base =
    "block rounded-md border px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-gold-500/40";
  const idle =
    tone === "red"
      ? "border-red-500/40 bg-red-500/10"
      : "border-charcoal-700 bg-charcoal-800";
  const hover = href
    ? tone === "red"
      ? "cursor-pointer hover:border-red-400/70 hover:bg-red-500/15"
      : "cursor-pointer hover:border-gold-500/50 hover:bg-charcoal-700"
    : "";

  const inner = (
    <>
      <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
        {label}
      </p>
      <p
        className={
          tone === "red"
            ? "font-display text-lg text-red-300"
            : "font-display text-lg text-charcoal-50"
        }
      >
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${base} ${idle} ${hover}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${base} ${idle}`}>{inner}</div>;
}

function ScheduleCard({
  title,
  subtitle,
  jobs,
  clientMap,
  empty,
}: {
  title: string;
  subtitle: string;
  jobs: Job[];
  clientMap: Map<string, Pick<Client, "id" | "contact_name" | "company_name">>;
  empty: string;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="px-6 pt-6">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {jobs.length === 0
              ? subtitle
              : `${subtitle} · ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
          </CardDescription>
        </div>
      </CardHeader>
      {jobs.length === 0 ? (
        <p className="px-6 py-6 text-sm text-charcoal-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-charcoal-700 border-t border-charcoal-700">
          {jobs.map((j) => {
            const c = clientMap.get(j.client_id);
            return (
              <li key={j.id}>
                <Link
                  href={`/admin/jobs/${j.id}`}
                  className="block px-6 py-3 transition hover:bg-charcoal-700/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-charcoal-100">{j.title}</p>
                      <p className="truncate text-xs text-charcoal-400">
                        {c?.contact_name ?? "—"}
                        {c?.company_name ? ` · ${c.company_name}` : ""}
                      </p>
                      {j.address ? (
                        <p className="truncate text-xs text-charcoal-500">
                          {j.address}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                        Starts
                      </p>
                      <p className="font-display text-sm text-gold-300 tabular-nums">
                        {formatDate(j.start_date)}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ActionCard({
  title,
  count,
  href,
  empty,
  children,
}: {
  title: string;
  count: number;
  href: string;
  empty: string;
  children: React.ReactNode;
}) {
  const has = count > 0;
  return (
    <Link
      href={href}
      className={
        has
          ? "group block rounded-xl border border-red-500/40 bg-red-500/5 p-5 transition hover:border-red-400/60 hover:bg-red-500/10"
          : "group block rounded-xl border border-charcoal-700 bg-charcoal-800 p-5 transition hover:border-charcoal-600"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={
            has
              ? "text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300"
              : "text-[10px] font-semibold uppercase tracking-[0.22em] text-charcoal-400"
          }
        >
          {title}
        </p>
        <span
          className={
            has
              ? "font-display text-2xl text-red-200"
              : "font-display text-2xl text-charcoal-300"
          }
        >
          {count}
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {has ? (
          children
        ) : (
          <p className="text-sm text-charcoal-400">{empty}</p>
        )}
      </div>
    </Link>
  );
}
