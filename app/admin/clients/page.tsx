import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SearchInput } from "@/components/admin/SearchInput";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `contact_name.ilike.${term},company_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
    );
  }

  const { data: clients } = await query;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">Clients</p>
          <h1 className="rw-display mt-2 text-3xl">Clients</h1>
        </div>
        <ButtonLink href="/admin/clients/new">
          <Plus className="h-4 w-4" /> New client
        </ButtonLink>
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div className="flex flex-1 items-end justify-between gap-4">
            <div>
              <CardTitle>Directory</CardTitle>
              <CardDescription>
                Companies and individuals we&apos;ve worked with.
              </CardDescription>
            </div>
            <SearchInput placeholder="Search name, company, email…" />
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Company</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Phone</th>
              <th className="px-6 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(clients ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-charcoal-400">
                  {q ? `No clients matched “${q}.”` : "No clients yet."}
                </td>
              </tr>
            ) : (
              (clients as Client[]).map((c) => (
                <tr key={c.id} className="hover:bg-charcoal-700/30 transition">
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="text-charcoal-100 hover:text-gold-400 transition"
                    >
                      {c.contact_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-charcoal-300">{c.company_name ?? "—"}</td>
                  <td className="px-6 py-3 text-charcoal-300">{c.email ?? "—"}</td>
                  <td className="px-6 py-3 text-charcoal-300">{c.phone ?? "—"}</td>
                  <td className="px-6 py-3 text-charcoal-400">{formatDate(c.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
