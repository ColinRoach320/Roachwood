import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Receipt, Wallet, ClipboardList, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  JobStatusBadge,
  EstimateStatusBadge,
  InvoiceStatusBadge,
  ExpenseCategoryBadge,
} from "@/components/ui/Badge";
import { JobUpdateForm } from "@/components/admin/JobUpdateForm";
import { addJobUpdate } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatMoney } from "@/lib/utils";
import type {
  Job,
  Client,
  JobUpdate,
  Estimate,
  Invoice,
  Expense,
  DocumentRow,
} from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle<Job>();

  if (!job) notFound();

  const [
    { data: client },
    { data: updates },
    { data: estimates },
    { data: invoices },
    { data: expenses },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, contact_name, company_name, email, phone")
      .eq("id", job.client_id)
      .maybeSingle<Pick<Client, "id" | "contact_name" | "company_name" | "email" | "phone">>(),
    supabase
      .from("job_updates")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("estimates")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .eq("job_id", id)
      .order("date", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const expenseTotal = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount ?? 0),
    0,
  );
  const invoicedTotal = (invoices ?? []).reduce(
    (sum, i) => sum + Number(i.total ?? 0),
    0,
  );
  const paidTotal = (invoices ?? []).reduce(
    (sum, i) => sum + Number(i.amount_paid ?? 0),
    0,
  );

  const updateAction = addJobUpdate.bind(null, id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">
            <Link href="/admin/jobs" className="hover:text-gold-300">
              Jobs
            </Link>{" "}
            / Detail
          </p>
          <h1 className="rw-display mt-2 text-3xl">{job.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <JobStatusBadge status={job.status} />
            {client ? (
              <Link
                href={`/admin/clients/${client.id}`}
                className="text-sm text-charcoal-300 hover:text-gold-400"
              >
                {client.contact_name}
                {client.company_name ? ` · ${client.company_name}` : ""}
              </Link>
            ) : null}
          </div>
        </div>
        <ButtonLink href={`/admin/jobs/${id}/edit`} variant="secondary">
          <Pencil className="h-4 w-4" /> Edit job
        </ButtonLink>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Estimated value" value={formatCurrency(job.estimated_value)} />
        <Stat label="Invoiced" value={formatMoney(invoicedTotal)} />
        <Stat label="Paid" value={formatMoney(paidTotal)} />
        <Stat label="Expenses" value={formatMoney(expenseTotal)} />
      </div>

      {/* Info + Updates */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Job info</CardTitle>
            </div>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Start" value={formatDate(job.start_date)} />
            <Field label="Target end" value={formatDate(job.end_date)} />
            <Field label="Site address" value={job.address ?? "—"} />
            <Field label="Created" value={formatDate(job.created_at)} />
            <div className="col-span-2 mt-2 border-t border-charcoal-700 pt-3">
              <p className="rw-eyebrow mb-1">Description</p>
              <p className="whitespace-pre-wrap text-charcoal-200">
                {job.description ?? (
                  <span className="text-charcoal-500">No description.</span>
                )}
              </p>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Updates</CardTitle>
              <CardDescription>{(updates ?? []).length} entries</CardDescription>
            </div>
          </CardHeader>
          <JobUpdateForm action={updateAction} />
          <ul className="mt-5 space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {(updates ?? []).length === 0 ? (
              <li className="text-sm text-charcoal-500">No updates yet.</li>
            ) : (
              (updates as JobUpdate[]).map((u) => (
                <li
                  key={u.id}
                  className="rounded-md border border-charcoal-700 bg-charcoal-900/40 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em]">
                    <span className="text-charcoal-400">
                      {formatDate(u.created_at)}
                    </span>
                    {u.visible_to_client ? (
                      <span className="text-gold-400">Client visible</span>
                    ) : (
                      <span className="text-charcoal-500">Internal</span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-charcoal-100">
                    {u.body}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {/* Estimates */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-gold-400" />
                Estimates
              </span>
            </CardTitle>
            <CardDescription>{(estimates ?? []).length} on this job.</CardDescription>
          </div>
          <ButtonLink href={`/admin/estimates/new?job_id=${id}`} size="sm">
            <Plus className="h-4 w-4" /> New estimate
          </ButtonLink>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(estimates ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-charcoal-400">
                  No estimates yet.
                </td>
              </tr>
            ) : (
              (estimates as Estimate[]).map((e) => (
                <tr key={e.id} className="hover:bg-charcoal-700/30">
                  <td className="px-6 py-3">
                    <Link href={`/admin/estimates/${e.id}`} className="text-charcoal-100 hover:text-gold-400">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3"><EstimateStatusBadge status={e.status} /></td>
                  <td className="px-6 py-3 text-charcoal-300">{formatDate(e.created_at)}</td>
                  <td className="px-6 py-3 text-right text-charcoal-200">{formatMoney(e.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Invoices */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Receipt className="h-5 w-5 text-gold-400" />
                Invoices
              </span>
            </CardTitle>
            <CardDescription>{(invoices ?? []).length} on this job.</CardDescription>
          </div>
          <ButtonLink href={`/admin/invoices/new?job_id=${id}`} size="sm">
            <Plus className="h-4 w-4" /> New invoice
          </ButtonLink>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Due</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(invoices ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-charcoal-400">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              (invoices as Invoice[]).map((inv) => (
                <tr key={inv.id} className="hover:bg-charcoal-700/30">
                  <td className="px-6 py-3">
                    <Link href={`/admin/invoices/${inv.id}`} className="text-charcoal-100 hover:text-gold-400">
                      {inv.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-6 py-3 text-charcoal-300">{formatDate(inv.due_date)}</td>
                  <td className="px-6 py-3 text-right text-charcoal-200">{formatMoney(inv.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Expenses */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-5 w-5 text-gold-400" />
                Expenses
              </span>
            </CardTitle>
            <CardDescription>
              {(expenses ?? []).length} entries · {formatMoney(expenseTotal)} total
            </CardDescription>
          </div>
          <ButtonLink href={`/admin/expenses/new?job_id=${id}`} size="sm">
            <Plus className="h-4 w-4" /> Log expense
          </ButtonLink>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Vendor</th>
              <th className="px-6 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(expenses ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-charcoal-400">
                  No expenses logged yet.
                </td>
              </tr>
            ) : (
              (expenses as Expense[]).map((ex) => (
                <tr key={ex.id} className="hover:bg-charcoal-700/30">
                  <td className="px-6 py-3 text-charcoal-300">{formatDate(ex.date)}</td>
                  <td className="px-6 py-3">
                    {ex.category ? (
                      <ExpenseCategoryBadge category={ex.category} />
                    ) : (
                      <span className="text-charcoal-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-charcoal-300">{ex.vendor ?? "—"}</td>
                  <td className="px-6 py-3 text-right text-charcoal-200">{formatMoney(ex.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold-400" />
                Documents
              </span>
            </CardTitle>
            <CardDescription>
              {(documents ?? []).length} file{(documents ?? []).length === 1 ? "" : "s"} attached.
              Upload UI ships in a follow-up.
            </CardDescription>
          </div>
        </CardHeader>
        {(documents ?? []).length === 0 ? (
          <p className="text-sm text-charcoal-500">No documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {(documents as DocumentRow[]).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-900/40 px-3 py-2 text-sm"
              >
                <span className="text-charcoal-100">{d.name}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-charcoal-500">
                  {formatDate(d.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-charcoal-400">{label}</dt>
      <dd className="mt-0.5 text-charcoal-100">{value}</dd>
    </div>
  );
}
