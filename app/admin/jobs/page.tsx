import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SearchInput } from "@/components/admin/SearchInput";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Job, Client, JobStatus } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminJobsPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `title.ilike.${term},description.ilike.${term},address.ilike.${term}`,
    );
  }

  const { data: jobs } = await query;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, contact_name, company_name");

  const clientMap = new Map<string, Client>(
    ((clients ?? []) as Client[]).map((c) => [c.id, c]),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">Jobs</p>
          <h1 className="rw-display mt-2 text-3xl">All jobs</h1>
        </div>
        <ButtonLink href="/admin/jobs/new">
          <Plus className="h-4 w-4" /> New job
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter param="status" options={STATUS_OPTIONS} />
        <SearchInput placeholder="Search title, address…" />
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>
              {(jobs ?? []).length} job{(jobs ?? []).length === 1 ? "" : "s"}
              {status ? ` with status “${status.replace("_", " ")}”` : ""}.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Start</th>
              <th className="px-6 py-3 font-medium">Due</th>
              <th className="px-6 py-3 font-medium text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(jobs ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-charcoal-400">
                  {q || status ? "No jobs match those filters." : "No jobs yet."}
                </td>
              </tr>
            ) : (
              (jobs as Job[]).map((j) => {
                const client = clientMap.get(j.client_id);
                return (
                  <tr key={j.id} className="hover:bg-charcoal-700/30 transition">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/jobs/${j.id}`}
                        className="text-charcoal-100 hover:text-gold-400 transition"
                      >
                        {j.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {client ? (
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="hover:text-gold-400"
                        >
                          {client.contact_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <JobStatusBadge status={j.status as JobStatus} />
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">{formatDate(j.start_date)}</td>
                    <td className="px-6 py-3 text-charcoal-300">{formatDate(j.end_date)}</td>
                    <td className="px-6 py-3 text-right text-charcoal-200">
                      {formatCurrency(j.estimated_value)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
