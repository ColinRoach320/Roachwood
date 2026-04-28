import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Phone,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TRADE_LABELS } from "@/components/admin/TradePicker";
import { RecordSubPaymentForm } from "@/components/admin/RecordSubPaymentForm";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type {
  Subcontractor,
  SubcontractorPayment,
  Job,
} from "@/lib/types";
import { recordSubcontractorPayment } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubcontractorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("id", id)
    .maybeSingle<Subcontractor>();
  if (!sub) notFound();

  const [{ data: payments }, { data: jobs }] = await Promise.all([
    supabase
      .from("subcontractor_payments")
      .select("*")
      .eq("subcontractor_id", id)
      .order("date", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title")
      .order("created_at", { ascending: false }),
  ]);

  const allPayments = (payments ?? []) as SubcontractorPayment[];
  const totalPaid = allPayments.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0,
  );

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const ytdPaid = allPayments
    .filter((p) => p.date >= yearStart)
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const requires1099 = ytdPaid >= 600;

  const jobOptions = (jobs ?? []) as Pick<Job, "id" | "title">[];
  const jobMap = new Map(jobOptions.map((j) => [j.id, j.title]));
  const jobsWorked = Array.from(
    new Set(
      allPayments
        .map((p) => p.job_id)
        .filter((j): j is string => !!j),
    ),
  );

  const paymentAction = recordSubcontractorPayment.bind(null, id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rw-eyebrow">
            <Link href="/admin/subcontractors" className="hover:text-gold-300">
              Subcontractors
            </Link>{" "}
            / Detail
          </p>
          <h1 className="rw-display mt-2 text-3xl">{sub.contact_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-charcoal-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-charcoal-200">
              {TRADE_LABELS[sub.trade]}
            </span>
            {sub.company_name ? (
              <span className="text-sm text-charcoal-300">
                · {sub.company_name}
              </span>
            ) : null}
          </div>
        </div>
        <ButtonLink
          href={`/admin/subcontractors/${id}/edit`}
          variant="secondary"
        >
          <Pencil className="h-4 w-4" /> Edit
        </ButtonLink>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total paid" value={formatMoney(totalPaid)} />
        <Stat
          label={`Paid in ${currentYear}`}
          value={formatMoney(ytdPaid)}
          tone={requires1099 ? "alert" : "default"}
          subtitle={
            requires1099
              ? "1099 required — over $600"
              : `$${(600 - ytdPaid).toFixed(0)} until 1099 threshold`
          }
        />
        <div className="rw-card flex items-center justify-between p-5">
          <div>
            <p className="rw-eyebrow">W-9</p>
            <p className="mt-1 text-sm text-charcoal-300">
              {sub.w9_on_file
                ? "On file — ready for 1099 filing."
                : "Missing — request before paying $600+."}
            </p>
          </div>
          {sub.w9_on_file ? (
            <ShieldCheck className="h-10 w-10 text-emerald-400" strokeWidth={1.5} />
          ) : (
            <ShieldAlert className="h-10 w-10 text-red-400" strokeWidth={1.5} />
          )}
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
              {sub.email ? (
                <a href={`mailto:${sub.email}`} className="rw-link">
                  {sub.email}
                </a>
              ) : (
                <span className="text-charcoal-500">—</span>
              )}
            </li>
            <li className="flex items-start gap-2.5 text-charcoal-200">
              <Phone className="mt-0.5 h-4 w-4 text-charcoal-500" />
              {sub.phone ? (
                <a
                  href={`tel:${sub.phone.replace(/[^0-9+]/g, "")}`}
                  className="rw-link"
                >
                  {sub.phone}
                </a>
              ) : (
                <span className="text-charcoal-500">—</span>
              )}
            </li>
            {sub.rate ? (
              <li className="flex items-start gap-2.5 text-charcoal-200">
                <Wallet className="mt-0.5 h-4 w-4 text-charcoal-500" />
                {formatMoney(sub.rate)}
                {sub.rate_type ? ` / ${sub.rate_type}` : ""}
              </li>
            ) : null}
            {sub.tax_id ? (
              <li className="text-xs text-charcoal-400">
                Tax ID: <span className="font-mono">{sub.tax_id}</span>
              </li>
            ) : null}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm text-charcoal-200">
            {sub.notes ?? (
              <span className="text-charcoal-500">No notes recorded.</span>
            )}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Log a payment</CardTitle>
            <CardDescription>
              Goes into the payment history below and counts toward the
              1099 total.
            </CardDescription>
          </div>
        </CardHeader>
        <RecordSubPaymentForm action={paymentAction} jobs={jobOptions} />
      </Card>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 pt-6">
          <div>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>
              {allPayments.length} payment
              {allPayments.length === 1 ? "" : "s"} · {formatMoney(totalPaid)}{" "}
              total · worked {jobsWorked.length} job
              {jobsWorked.length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-y border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Job</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {allPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-charcoal-400"
                >
                  No payments logged yet.
                </td>
              </tr>
            ) : (
              allPayments.map((p) => (
                <tr key={p.id} className="hover:bg-charcoal-700/30">
                  <td className="px-6 py-3 text-charcoal-300">
                    {formatDate(p.date)}
                  </td>
                  <td className="px-6 py-3 text-charcoal-300">
                    {p.job_id ? (
                      <Link
                        href={`/admin/jobs/${p.job_id}`}
                        className="hover:text-gold-400"
                      >
                        {jobMap.get(p.job_id) ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 text-charcoal-400 truncate max-w-[300px]">
                    {p.description ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-right text-charcoal-100 tabular-nums">
                    {formatMoney(p.amount)}
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

function Stat({
  label,
  value,
  tone = "default",
  subtitle,
}: {
  label: string;
  value: string;
  tone?: "default" | "alert";
  subtitle?: string;
}) {
  return (
    <div
      className={`rw-card p-5 ${
        tone === "alert" ? "border-red-500/40 bg-red-500/5" : ""
      }`}
    >
      <p className="rw-eyebrow">{label}</p>
      <p
        className={`mt-2 font-display text-2xl tabular-nums ${
          tone === "alert" ? "text-red-300" : "text-charcoal-50"
        }`}
      >
        {value}
      </p>
      {subtitle ? (
        <p
          className={`mt-1 text-xs ${
            tone === "alert" ? "text-red-300/80" : "text-charcoal-400"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
