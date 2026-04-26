import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { JobStatusBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Job } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle<Client>();

  if (!client) notFound();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const totalValue = (jobs ?? []).reduce(
    (sum, j) => sum + Number(j.estimated_value ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">
            <Link href="/admin/clients" className="hover:text-gold-300">
              Clients
            </Link>{" "}
            / Detail
          </p>
          <h1 className="rw-display mt-2 text-3xl">{client.contact_name}</h1>
          {client.company_name ? (
            <p className="mt-1 text-charcoal-300">{client.company_name}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/admin/clients/${id}/edit`} variant="secondary">
            <Pencil className="h-4 w-4" /> Edit
          </ButtonLink>
          <ButtonLink href={`/admin/jobs/new?client_id=${id}`}>
            <Plus className="h-4 w-4" /> New job
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contact</CardTitle>
            </div>
          </CardHeader>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5 text-charcoal-200">
              <Mail className="mt-0.5 h-4 w-4 text-charcoal-500" />
              {client.email ?? <span className="text-charcoal-500">—</span>}
            </li>
            <li className="flex items-start gap-2.5 text-charcoal-200">
              <Phone className="mt-0.5 h-4 w-4 text-charcoal-500" />
              {client.phone ?? <span className="text-charcoal-500">—</span>}
            </li>
            <li className="flex items-start gap-2.5 text-charcoal-200">
              <MapPin className="mt-0.5 h-4 w-4 text-charcoal-500" />
              {client.address ?? <span className="text-charcoal-500">—</span>}
            </li>
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm text-charcoal-200">
            {client.notes ?? (
              <span className="text-charcoal-500">No notes recorded.</span>
            )}
          </p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>
              {(jobs ?? []).length} total · {formatCurrency(totalValue)} pipeline value
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Start</th>
              <th className="px-6 py-3 font-medium">Due</th>
              <th className="px-6 py-3 font-medium text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(jobs ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-charcoal-400">
                  No jobs yet — create one to get started.
                </td>
              </tr>
            ) : (
              (jobs as Job[]).map((j) => (
                <tr key={j.id} className="hover:bg-charcoal-700/30 transition">
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/jobs/${j.id}`}
                      className="text-charcoal-100 hover:text-gold-400"
                    >
                      {j.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3"><JobStatusBadge status={j.status} /></td>
                  <td className="px-6 py-3 text-charcoal-300">{formatDate(j.start_date)}</td>
                  <td className="px-6 py-3 text-charcoal-300">{formatDate(j.end_date)}</td>
                  <td className="px-6 py-3 text-right text-charcoal-200">
                    {formatCurrency(j.estimated_value)}
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
