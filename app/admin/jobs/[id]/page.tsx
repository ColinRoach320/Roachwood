import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Plus,
  Receipt,
  Wallet,
  ClipboardList,
  FileText,
  Camera,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  JobStatusBadge,
  EstimateStatusBadge,
  InvoiceStatusBadge,
  ExpenseCategoryBadge,
} from "@/components/ui/Badge";
import { JobUpdateForm } from "@/components/admin/JobUpdateForm";
import { PhotoUploadButton } from "@/components/admin/PhotoUploadButton";
import { MessageThread } from "@/components/admin/MessageThread";
import { EmailDocumentForm } from "@/components/admin/EmailDocumentForm";
import { addJobUpdate } from "../actions";
import { sendJobCompleteEmail } from "../email-actions";
import { uploadJobPhoto } from "./photo-actions";
import { sendMessage } from "./message-actions";
import { getDesignIdeaSignedUrl } from "@/app/portal/jobs/[id]/design-ideas-actions";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatMoney } from "@/lib/utils";
import type {
  Job,
  Client,
  JobUpdate,
  Estimate,
  Invoice,
  Expense,
  DocumentRow,
  DesignIdea,
  Message,
  Profile,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: client },
    { data: updates },
    { data: estimates },
    { data: invoices },
    { data: expenses },
    { data: documents },
    { data: designIdeas },
    { data: messages },
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
    supabase
      .from("design_ideas")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
  ]);

  // Split documents into photos vs files using the new kind column.
  const allDocs = (documents ?? []) as DocumentRow[];
  const photos = allDocs.filter((d) => d.kind === "photo");
  const files = allDocs.filter((d) => d.kind !== "photo");

  const ideas = (designIdeas ?? []) as DesignIdea[];
  const ideaUrls = await Promise.all(
    ideas.map(async (i) =>
      i.storage_path ? await getDesignIdeaSignedUrl(i.storage_path) : null,
    ),
  );

  // Pre-sign photos so the admin page can render them without exposing
  // the service-role key to the client.
  const adminClient = createAdminClient();
  const photoUrls = await Promise.all(
    photos.map(async (p) => {
      const { data } = await adminClient.storage
        .from("documents")
        .createSignedUrl(p.storage_path, 60 * 30);
      return data?.signedUrl ?? null;
    }),
  );

  // Resolve sender names for the message thread.
  const senderIds = Array.from(
    new Set(((messages ?? []) as Message[]).map((m) => m.sender_id)),
  );
  const { data: senders } = senderIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds)
    : { data: [] };
  const senderMap = new Map(
    (senders ?? []).map((p: Pick<Profile, "id" | "full_name" | "email">) => [
      p.id,
      p,
    ]),
  );
  const threadMessages = ((messages ?? []) as Message[]).map((m) => {
    const s = senderMap.get(m.sender_id);
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender_name: s?.full_name ?? s?.email ?? null,
      is_me: m.sender_id === user?.id,
    };
  });

  const expenseTotal = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount ?? 0),
    0,
  );
  const expenseByCategory = ((expenses ?? []) as Expense[]).reduce<
    Record<string, number>
  >((acc, e) => {
    const key = e.category ?? "other";
    acc[key] = (acc[key] ?? 0) + Number(e.amount ?? 0);
    return acc;
  }, {});
  const invoicedTotal = (invoices ?? []).reduce(
    (sum, i) => sum + Number(i.total ?? 0),
    0,
  );
  const paidTotal = (invoices ?? []).reduce(
    (sum, i) => sum + Number(i.amount_paid ?? 0),
    0,
  );

  const updateAction = addJobUpdate.bind(null, id);
  const photoAction = uploadJobPhoto.bind(null, id);
  const messageAction = sendMessage.bind(null, id);
  const completeEmailAction = sendJobCompleteEmail.bind(null, id);

  // Pre-filled review-request copy. Google review URL is a placeholder
  // until Colin sets up the live link.
  const completeSubject = `Thank You — ${job.title} is Complete`;
  const completeMessage =
    `Hi ${client?.contact_name ?? "there"},\n\n` +
    `We wanted to take a moment to thank you for putting your trust in Roachwood. ` +
    `It was a pleasure working on your project and we hope you love the finished result.\n\n` +
    `If you are happy with the work, the best way to support us is by leaving a review — ` +
    `it helps other homeowners find us and allows us to keep doing great work in the community.\n\n` +
    `[Google Review link — placeholder for now]\n\n` +
    `And if there is anything at all that needs attention, please do not hesitate to reach out. ` +
    `We stand behind our work.\n\n` +
    `Thank you again — we hope to work with you on your next project.\n\n` +
    `Colin Roach | Roachwood | (586) 344-0982 | roachwood.co`;

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

      <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
        <EmailDocumentForm
          action={completeEmailAction}
          documentLabel="job complete + review"
          defaultTo={client?.email ?? ""}
          defaultSubject={completeSubject}
          defaultMessage={completeMessage}
        />
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
        {(expenses ?? []).length > 0 ? (
          <div className="grid grid-cols-2 gap-2 border-y border-charcoal-700 bg-charcoal-900/40 px-6 py-4 sm:grid-cols-3 lg:grid-cols-5">
            {(["materials", "labor", "subcontractor", "equipment", "other"] as const).map(
              (key) => (
                <div key={key} className="rounded-md bg-charcoal-900/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </p>
                  <p className="mt-1 font-display text-base text-charcoal-50 tabular-nums">
                    {formatMoney(expenseByCategory[key] ?? 0)}
                  </p>
                </div>
              ),
            )}
          </div>
        ) : null}
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

      {/* Progress photos */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Camera className="h-5 w-5 text-gold-400" />
                Progress photos
              </span>
            </CardTitle>
            <CardDescription>
              {photos.length} photo{photos.length === 1 ? "" : "s"} on this job.
            </CardDescription>
          </div>
          <PhotoUploadButton action={photoAction} />
        </CardHeader>
        {photos.length === 0 ? (
          <p className="text-sm text-charcoal-500">
            No photos yet. The big button above pulls up the camera on a phone.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-900"
              >
                {photoUrls[i] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoUrls[i] as string}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                    Unavailable
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal-950/80 to-transparent px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-charcoal-100">
                  {formatDate(p.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Design ideas (read-only here; client adds via portal) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-gold-400" />
                Design ideas
              </span>
            </CardTitle>
            <CardDescription>
              Inspiration the client has shared. They add these from their portal.
            </CardDescription>
          </div>
        </CardHeader>
        {ideas.length === 0 ? (
          <p className="text-sm text-charcoal-500">
            Nothing shared yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {ideas.map((idea, i) => {
              const src = idea.storage_path ? ideaUrls[i] : idea.image_url;
              return (
                <li
                  key={idea.id}
                  className="flex gap-3 rounded-lg border border-charcoal-700 bg-charcoal-900/40 p-3"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-900">
                    {src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={src as string}
                        alt={idea.title ?? "Design idea"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.16em] text-charcoal-500">
                        No image
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {idea.title ? (
                      <p className="font-medium text-charcoal-50">
                        {idea.title}
                      </p>
                    ) : null}
                    {idea.notes ? (
                      <p className="mt-1 text-sm text-charcoal-300 line-clamp-3">
                        {idea.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-charcoal-500">
                      {formatDate(idea.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gold-400" />
                Messages
              </span>
            </CardTitle>
            <CardDescription>
              Two-way thread with the client on this job.
            </CardDescription>
          </div>
        </CardHeader>
        <MessageThread
          messages={threadMessages}
          action={messageAction}
          emptyHint="No messages yet. Send the first one to kick off the thread."
        />
      </Card>

      {/* Documents (PDFs/contracts; photos live above) */}
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
              {files.length} file{files.length === 1 ? "" : "s"} attached. Upload
              from <Link href="/admin/documents" className="rw-link">/admin/documents</Link>.
            </CardDescription>
          </div>
        </CardHeader>
        {files.length === 0 ? (
          <p className="text-sm text-charcoal-500">No documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((d) => (
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
