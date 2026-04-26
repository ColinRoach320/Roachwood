import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Job, Client } from "@/lib/types";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [jobsRes, clientsRes, pendingApprovalsRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, status, estimated_value, end_date, client_id, created_at, description, start_date, address, updated_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("clients")
      .select("id, contact_name, company_name, profile_id, email, phone, address, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("approvals")
      .select("id, title, status, job_id, created_at")
      .eq("status", "pending"),
  ]);

  const jobs = (jobsRes.data ?? []) as Job[];
  const clients = (clientsRes.data ?? []) as Client[];
  const pendingApprovals = pendingApprovalsRes.data?.length ?? 0;

  const activeJobs = jobs.filter(
    (j) => j.status === "approved" || j.status === "in_progress",
  ).length;
  const pipelineValue = jobs.reduce(
    (sum, j) =>
      j.status === "quoted" || j.status === "approved"
        ? sum + (j.estimated_value ?? 0)
        : sum,
    0,
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="rw-eyebrow">Dashboard</p>
        <h1 className="rw-display mt-2 text-3xl">Workshop Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Active jobs" value={activeJobs.toString()} />
        <Stat label="Pending client approvals" value={pendingApprovals.toString()} />
        <Stat label="Pipeline value" value={formatCurrency(pipelineValue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent jobs</CardTitle>
                <CardDescription>Latest 8 jobs across all clients.</CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-hidden rounded-lg border border-charcoal-700">
              <table className="w-full text-sm">
                <thead className="bg-charcoal-900/60">
                  <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-700">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-charcoal-400">
                        No jobs yet — run the migration and add a client.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-charcoal-700/30 transition">
                        <td className="px-4 py-3 text-charcoal-100">{j.title}</td>
                        <td className="px-4 py-3"><JobStatusBadge status={j.status} /></td>
                        <td className="px-4 py-3 text-charcoal-300">{formatDate(j.end_date)}</td>
                        <td className="px-4 py-3 text-right text-charcoal-200">{formatCurrency(j.estimated_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent clients</CardTitle>
              <CardDescription>Most recent additions.</CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {clients.length === 0 ? (
              <li className="text-charcoal-400 text-sm">No clients yet.</li>
            ) : (
              clients.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-900/40 px-3 py-2.5"
                >
                  <div>
                    <p className="text-charcoal-100">{c.contact_name}</p>
                    {c.company_name ? (
                      <p className="text-xs text-charcoal-400">{c.company_name}</p>
                    ) : null}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-charcoal-500">
                    {formatDate(c.created_at)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rw-card p-6">
      <p className="rw-eyebrow">{label}</p>
      <p className="mt-3 font-display text-3xl text-charcoal-50">{value}</p>
    </div>
  );
}
