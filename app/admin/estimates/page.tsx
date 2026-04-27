import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EstimateStatusBadge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/admin/SearchInput";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Estimate, Job, Client, EstimateStatus } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "no_response", label: "No response" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminEstimatesPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("estimates")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  const { data: estimates } = await query;

  const jobIds = Array.from(new Set((estimates ?? []).map((e) => e.job_id)));
  const { data: jobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title, client_id").in("id", jobIds)
    : { data: [] };
  const { data: clients } = jobs && jobs.length
    ? await supabase
        .from("clients")
        .select("id, contact_name")
        .in(
          "id",
          (jobs as Pick<Job, "id" | "client_id">[]).map((j) => j.client_id),
        )
    : { data: [] };

  const jobMap = new Map((jobs ?? []).map((j: Pick<Job, "id" | "title" | "client_id">) => [j.id, j]));
  const clientMap = new Map((clients ?? []).map((c: Pick<Client, "id" | "contact_name">) => [c.id, c]));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">Estimates</p>
          <h1 className="rw-display mt-2 text-3xl">Estimates</h1>
        </div>
        <ButtonLink href="/admin/estimates/new">
          <Plus className="h-4 w-4" /> New estimate
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter param="status" options={STATUS_OPTIONS} />
        <SearchInput placeholder="Search title…" />
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>All estimates</CardTitle>
            <CardDescription>
              {(estimates ?? []).length} record{(estimates ?? []).length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Job</th>
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(estimates ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-charcoal-400">
                  {q || status ? "No estimates match those filters." : "No estimates yet."}
                </td>
              </tr>
            ) : (
              (estimates as Estimate[]).map((e) => {
                const job = jobMap.get(e.job_id);
                const client = job ? clientMap.get(job.client_id) : null;
                return (
                  <tr key={e.id} className="hover:bg-charcoal-700/30">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/estimates/${e.id}`}
                        className="text-charcoal-100 hover:text-gold-400"
                      >
                        {e.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {job ? (
                        <Link href={`/admin/jobs/${job.id}`} className="hover:text-gold-400">
                          {job.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {client ? client.contact_name : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <EstimateStatusBadge status={e.status as EstimateStatus} />
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">{formatDate(e.created_at)}</td>
                    <td className="px-6 py-3 text-right text-charcoal-200 tabular-nums">
                      {formatMoney(e.total)}
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
