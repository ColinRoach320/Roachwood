import Link from "next/link";
import { Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SearchInput } from "@/components/admin/SearchInput";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { TRADE_LABELS } from "@/components/admin/TradePicker";
import { createClient } from "@/lib/supabase/server";
import type { Subcontractor, SubcontractorTrade } from "@/lib/types";

const TRADE_OPTIONS: { value: SubcontractorTrade; label: string }[] = (
  Object.keys(TRADE_LABELS) as SubcontractorTrade[]
).map((value) => ({ value, label: TRADE_LABELS[value] }));

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminSubcontractorsPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("subcontractors")
    .select("*")
    .order("contact_name", { ascending: true });
  if (status) query = query.eq("trade", status);
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `contact_name.ilike.${term},company_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
    );
  }

  const { data: subs } = await query;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">Subcontractors</p>
          <h1 className="rw-display mt-2 text-3xl">Subcontractors</h1>
        </div>
        <ButtonLink href="/admin/subcontractors/new">
          <Plus className="h-4 w-4" /> New subcontractor
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter
          param="status"
          options={TRADE_OPTIONS}
          allLabel="All trades"
        />
        <SearchInput placeholder="Search name, company, email…" />
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Directory</CardTitle>
            <CardDescription>
              {(subs ?? []).length} subcontractor
              {(subs ?? []).length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Company</th>
              <th className="px-6 py-3 font-medium">Trade</th>
              <th className="px-6 py-3 font-medium">Phone</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">W-9</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(subs ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-charcoal-400"
                >
                  {q || status
                    ? "No subcontractors match those filters."
                    : "No subcontractors yet."}
                </td>
              </tr>
            ) : (
              (subs as Subcontractor[]).map((s) => (
                <tr key={s.id} className="hover:bg-charcoal-700/30 transition">
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/subcontractors/${s.id}`}
                      className="text-charcoal-100 hover:text-gold-400 transition"
                    >
                      {s.contact_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-charcoal-300">
                    {s.company_name ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex rounded-full border border-charcoal-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-charcoal-200">
                      {TRADE_LABELS[s.trade]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-charcoal-300">
                    {s.phone ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-charcoal-300">
                    {s.email ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    {s.w9_on_file ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                        <ShieldCheck className="h-3 w-3" /> On file
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-red-300">
                        <ShieldAlert className="h-3 w-3" /> Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
