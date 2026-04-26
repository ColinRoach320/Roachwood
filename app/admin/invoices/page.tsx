import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/admin/SearchInput";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatMoney } from "@/lib/utils";
import type { Invoice, Job, Client, InvoiceStatus } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminInvoicesPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);

  const { data: invoices } = await query;

  const jobIds = Array.from(
    new Set(((invoices ?? []) as Invoice[]).map((i) => i.job_id)),
  );
  const { data: jobs } = jobIds.length
    ? await supabase
        .from("jobs")
        .select("id, title, client_id")
        .in("id", jobIds)
    : { data: [] };

  const clientIds = Array.from(
    new Set((jobs ?? []).map((j: Pick<Job, "client_id">) => j.client_id)),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, contact_name")
        .in("id", clientIds)
    : { data: [] };

  const jobMap = new Map(
    (jobs ?? []).map((j: Pick<Job, "id" | "title" | "client_id">) => [j.id, j]),
  );
  const clientMap = new Map(
    (clients ?? []).map((c: Pick<Client, "id" | "contact_name">) => [c.id, c]),
  );

  const billed = (invoices ?? []).reduce(
    (s, i) => s + Number(i.total ?? 0),
    0,
  );
  const collected = (invoices ?? []).reduce(
    (s, i) => s + Number(i.amount_paid ?? 0),
    0,
  );
  const outstanding = Math.max(0, billed - collected);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">Invoices</p>
          <h1 className="rw-display mt-2 text-3xl">Invoices</h1>
        </div>
        <ButtonLink href="/admin/invoices/new">
          <Plus className="h-4 w-4" /> New invoice
        </ButtonLink>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Billed" value={formatCurrency(billed)} />
        <Stat label="Collected" value={formatCurrency(collected)} />
        <Stat label="Outstanding" value={formatCurrency(outstanding)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter param="status" options={STATUS_OPTIONS} />
        <SearchInput placeholder="Search title…" />
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>All invoices</CardTitle>
            <CardDescription>
              {(invoices ?? []).length} record
              {(invoices ?? []).length === 1 ? "" : "s"}.
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
              <th className="px-6 py-3 font-medium">Due</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
              <th className="px-6 py-3 font-medium text-right">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(invoices ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-charcoal-400"
                >
                  {q || status
                    ? "No invoices match those filters."
                    : "No invoices yet."}
                </td>
              </tr>
            ) : (
              (invoices as Invoice[]).map((i) => {
                const job = jobMap.get(i.job_id);
                const client = job ? clientMap.get(job.client_id) : null;
                return (
                  <tr key={i.id} className="hover:bg-charcoal-700/30 transition">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/invoices/${i.id}`}
                        className="text-charcoal-100 hover:text-gold-400"
                      >
                        {i.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {job ? (
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="hover:text-gold-400"
                        >
                          {job.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {client?.contact_name ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <InvoiceStatusBadge status={i.status as InvoiceStatus} />
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {formatDate(i.due_date)}
                    </td>
                    <td className="px-6 py-3 text-right text-charcoal-200 tabular-nums">
                      {formatMoney(i.total)}
                    </td>
                    <td className="px-6 py-3 text-right text-charcoal-300 tabular-nums">
                      {formatMoney(i.amount_paid)}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rw-card p-5">
      <p className="rw-eyebrow">{label}</p>
      <p className="mt-2 font-display text-2xl text-charcoal-50">{value}</p>
    </div>
  );
}
