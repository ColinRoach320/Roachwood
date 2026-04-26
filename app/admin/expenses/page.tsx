import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ExpenseCategoryBadge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/admin/SearchInput";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatMoney } from "@/lib/utils";
import type { Expense, Job } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminExpensesPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  // Reuse the StatusFilter component by treating "category" as the status.
  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
  if (status) query = query.eq("category", status);
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`vendor.ilike.${term},notes.ilike.${term}`);
  }

  const { data: expenses } = await query;

  const jobIds = Array.from(
    new Set(((expenses ?? []) as Expense[]).map((e) => e.job_id)),
  );
  const { data: jobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title").in("id", jobIds)
    : { data: [] };
  const jobMap = new Map(
    (jobs ?? []).map((j: Pick<Job, "id" | "title">) => [j.id, j]),
  );

  const total = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">Expenses</p>
          <h1 className="rw-display mt-2 text-3xl">Expenses</h1>
        </div>
        <ButtonLink href="/admin/expenses/new">
          <Plus className="h-4 w-4" /> Log expense
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter
          param="status"
          options={CATEGORY_OPTIONS}
          allLabel="All categories"
        />
        <SearchInput placeholder="Search vendor, notes…" />
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>All expenses</CardTitle>
            <CardDescription>
              {(expenses ?? []).length} record
              {(expenses ?? []).length === 1 ? "" : "s"} ·{" "}
              {formatCurrency(total)} total.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Vendor</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Job</th>
              <th className="px-6 py-3 font-medium">Notes</th>
              <th className="px-6 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(expenses ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-charcoal-400"
                >
                  {q || status ? "No expenses match those filters." : "No expenses yet."}
                </td>
              </tr>
            ) : (
              (expenses as Expense[]).map((e) => {
                const job = jobMap.get(e.job_id);
                return (
                  <tr key={e.id} className="hover:bg-charcoal-700/30 transition">
                    <td className="px-6 py-3 text-charcoal-300">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-6 py-3 text-charcoal-100">
                      <Link
                        href={`/admin/expenses/${e.id}/edit`}
                        className="hover:text-gold-400"
                      >
                        {e.vendor ?? "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      {e.category ? (
                        <ExpenseCategoryBadge category={e.category} />
                      ) : (
                        <span className="text-charcoal-500">—</span>
                      )}
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
                    <td className="px-6 py-3 text-charcoal-400 truncate max-w-[260px]">
                      {e.notes ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-charcoal-200 tabular-nums">
                      {formatMoney(e.amount)}
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
