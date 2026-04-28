import { notFound } from "next/navigation";
import {
  Camera,
  Lightbulb,
  MessageSquare,
  FileText,
  ClipboardList,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  JobStatusBadge,
  ApprovalStatusBadge,
  EstimateStatusBadge,
  InvoiceStatusBadge,
  ChangeOrderStatusBadge,
} from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MessageThread } from "@/components/admin/MessageThread";
import { DesignIdeaForm } from "@/components/portal/DesignIdeaForm";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type {
  Job,
  JobUpdate,
  Approval,
  Estimate,
  Invoice,
  DocumentRow,
  DesignIdea,
  Message,
  Profile,
  ChangeOrder,
} from "@/lib/types";
import { decideApproval, decideChangeOrder } from "./actions";
import {
  addDesignIdea,
  getDesignIdeaSignedUrl,
} from "./design-ideas-actions";
import { sendMessage } from "@/app/admin/jobs/[id]/message-actions";

export default async function ClientJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    updatesRes,
    approvalsRes,
    estimatesRes,
    invoicesRes,
    documentsRes,
    ideasRes,
    messagesRes,
    changeOrdersRes,
  ] = await Promise.all([
    supabase
      .from("job_updates")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
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
    supabase
      .from("change_orders")
      .select("*")
      .eq("job_id", id)
      .order("co_number", { ascending: false }),
  ]);

  const updates = (updatesRes.data ?? []) as JobUpdate[];
  const approvals = (approvalsRes.data ?? []) as Approval[];
  const estimates = (estimatesRes.data ?? []) as Estimate[];
  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const allDocs = (documentsRes.data ?? []) as DocumentRow[];
  const photos = allDocs.filter((d) => d.kind === "photo");
  const files = allDocs.filter((d) => d.kind !== "photo");
  const ideas = (ideasRes.data ?? []) as DesignIdea[];
  const messages = (messagesRes.data ?? []) as Message[];
  const changeOrders = (changeOrdersRes.data ?? []) as ChangeOrder[];
  const pendingChangeOrders = changeOrders.filter((c) => c.status === "sent");
  const decidedChangeOrders = changeOrders.filter(
    (c) => c.status === "approved" || c.status === "declined",
  );

  // Sign photo URLs server-side (clients can't read the bucket directly).
  const adminClient = createAdminClient();
  const photoUrls = await Promise.all(
    photos.map(async (p) => {
      const { data } = await adminClient.storage
        .from("documents")
        .createSignedUrl(p.storage_path, 60 * 30);
      return data?.signedUrl ?? null;
    }),
  );
  const ideaUrls = await Promise.all(
    ideas.map(async (i) =>
      i.storage_path ? await getDesignIdeaSignedUrl(i.storage_path) : null,
    ),
  );
  const fileUrls = await Promise.all(
    files.map(async (f) => {
      const { data } = await adminClient.storage
        .from("documents")
        .createSignedUrl(f.storage_path, 60 * 30);
      return data?.signedUrl ?? null;
    }),
  );

  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
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
  const threadMessages = messages.map((m) => {
    const s = senderMap.get(m.sender_id);
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender_name: s?.full_name ?? s?.email ?? "Colin",
      is_me: m.sender_id === user?.id,
    };
  });

  const ideaAction = addDesignIdea.bind(null, id);
  const messageAction = sendMessage.bind(null, id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="rw-eyebrow">Project</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rw-display text-3xl">{job.title}</h1>
          <JobStatusBadge status={job.status} />
        </div>
        {job.description ? (
          <p className="mt-3 max-w-2xl text-sm text-charcoal-300 leading-relaxed">
            {job.description}
          </p>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Detail label="Start" value={formatDate(job.start_date)} />
          <Detail label="Target" value={formatDate(job.end_date)} />
          <Detail label="Address" value={job.address ?? "—"} />
          <Detail
            label="Updates"
            value={`${updates.length} note${updates.length === 1 ? "" : "s"}`}
          />
        </dl>
      </div>

      {/* Approvals */}
      {approvals.length > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Approvals</CardTitle>
              <CardDescription>Decisions Colin needs from you.</CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {approvals.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-charcoal-700 bg-charcoal-900/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-charcoal-100">{a.title}</p>
                    {a.description ? (
                      <p className="mt-1 text-sm text-charcoal-300">
                        {a.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                      Requested {formatDate(a.created_at)}
                    </p>
                  </div>
                  <ApprovalStatusBadge status={a.status} />
                </div>

                {a.status === "pending" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <form action={decideApproval} className="flex-1">
                      <input type="hidden" name="approval_id" value={a.id} />
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <Button
                        type="submit"
                        size="md"
                        className="h-12 w-full bg-emerald-500 text-charcoal-950 hover:bg-emerald-400"
                      >
                        Approve
                      </Button>
                    </form>
                    <form action={decideApproval} className="flex-1">
                      <input type="hidden" name="approval_id" value={a.id} />
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button
                        type="submit"
                        size="md"
                        variant="secondary"
                        className="h-12 w-full"
                      >
                        Decline
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Change orders */}
      {changeOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Change orders</CardTitle>
              <CardDescription>
                {pendingChangeOrders.length > 0
                  ? "Scope changes that need your approval before work continues."
                  : "Scope changes for this project."}
              </CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {pendingChangeOrders.map((co) => (
              <li
                key={co.id}
                className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300">
                      CO-{co.co_number}
                    </p>
                    <p className="mt-1 text-charcoal-50">{co.title}</p>
                    {co.description ? (
                      <p className="mt-2 text-sm text-charcoal-300 leading-relaxed">
                        {co.description}
                      </p>
                    ) : null}
                    <p className="mt-3 font-display text-xl text-charcoal-50 tabular-nums">
                      {formatMoney(co.total)}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                      Sent {formatDate(co.created_at)}
                    </p>
                  </div>
                  <ChangeOrderStatusBadge status={co.status} />
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <form action={decideChangeOrder} className="flex-1">
                    <input type="hidden" name="change_order_id" value={co.id} />
                    <input type="hidden" name="job_id" value={job.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <Button
                      type="submit"
                      size="md"
                      className="h-12 w-full bg-emerald-500 text-charcoal-950 hover:bg-emerald-400"
                    >
                      Approve
                    </Button>
                  </form>
                  <form action={decideChangeOrder} className="flex-1">
                    <input type="hidden" name="change_order_id" value={co.id} />
                    <input type="hidden" name="job_id" value={job.id} />
                    <input type="hidden" name="decision" value="declined" />
                    <Button
                      type="submit"
                      size="md"
                      variant="secondary"
                      className="h-12 w-full"
                    >
                      Decline
                    </Button>
                  </form>
                </div>
              </li>
            ))}

            {decidedChangeOrders.map((co) => (
              <li
                key={co.id}
                className="rounded-lg border border-charcoal-700 bg-charcoal-900/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                      CO-{co.co_number} ·{" "}
                      {co.approved_at
                        ? `Approved ${formatDate(co.approved_at)}`
                        : co.declined_at
                          ? `Declined ${formatDate(co.declined_at)}`
                          : ""}
                    </p>
                    <p className="mt-1 text-charcoal-100">{co.title}</p>
                    <p className="mt-2 text-charcoal-300 tabular-nums">
                      {formatMoney(co.total)}
                    </p>
                  </div>
                  <ChangeOrderStatusBadge status={co.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Estimates */}
      {estimates.length > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-gold-400" />
                  Estimates
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <ul className="divide-y divide-charcoal-700">
            {estimates.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-charcoal-100">{e.title}</p>
                  <p className="text-xs text-charcoal-400">
                    {formatDate(e.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular-nums text-charcoal-200">
                    {formatMoney(e.total)}
                  </span>
                  <EstimateStatusBadge status={e.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Invoices */}
      {invoices.length > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-gold-400" />
                  Invoices
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {invoices.map((i) => {
              const remaining =
                Number(i.total ?? 0) - Number(i.amount_paid ?? 0);
              return (
                <li
                  key={i.id}
                  className="rounded-lg border border-charcoal-700 bg-charcoal-900/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-charcoal-100">{i.title}</p>
                      <p className="mt-1 text-xs text-charcoal-400">
                        {i.due_date
                          ? `Due ${formatDate(i.due_date)}`
                          : `Issued ${formatDate(i.created_at)}`}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={i.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3 text-sm">
                    <span className="text-charcoal-300">
                      Total{" "}
                      <span className="text-charcoal-100">
                        {formatMoney(i.total)}
                      </span>
                    </span>
                    {remaining > 0 ? (
                      <span className="font-display text-lg text-red-300 tabular-nums">
                        {formatMoney(remaining)} due
                      </span>
                    ) : (
                      <span className="font-display text-lg text-emerald-300">
                        Paid in full
                      </span>
                    )}
                  </div>
                  {remaining > 0 && i.stripe_payment_link ? (
                    <a
                      href={i.stripe_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-gold-500 text-xs font-semibold uppercase tracking-[0.22em] text-charcoal-950 hover:bg-gold-400 transition shadow-gold-glow"
                    >
                      Pay now
                    </a>
                  ) : remaining > 0 ? (
                    <p className="mt-3 text-xs text-charcoal-500">
                      Payment link will appear here once Colin sends it.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {/* Project log */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Project log</CardTitle>
            <CardDescription>Latest updates from Colin.</CardDescription>
          </div>
        </CardHeader>
        {updates.length === 0 ? (
          <p className="text-sm text-charcoal-400">No updates yet.</p>
        ) : (
          <ol className="relative space-y-6 border-l border-charcoal-700 pl-6">
            {updates.map((u) => (
              <li key={u.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-2 w-2 rounded-full bg-gold-500" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
                  {formatDate(u.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal-100 leading-relaxed">
                  {u.body}
                </p>
              </li>
            ))}
          </ol>
        )}
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
              {photos.length} photo{photos.length === 1 ? "" : "s"} from the workshop.
            </CardDescription>
          </div>
        </CardHeader>
        {photos.length === 0 ? (
          <p className="text-sm text-charcoal-400">
            Colin will post progress photos here as the project moves along.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p, i) =>
              photoUrls[i] ? (
                <a
                  key={p.id}
                  href={photoUrls[i] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrls[i] as string}
                    alt={p.name}
                    className="h-full w-full object-cover transition hover:scale-[1.03]"
                  />
                </a>
              ) : null,
            )}
          </div>
        )}
      </Card>

      {/* Design ideas (client adds) */}
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
              Inspiration photos help Colin understand the look you&rsquo;re after.
            </CardDescription>
          </div>
        </CardHeader>

        <DesignIdeaForm action={ideaAction} />

        {ideas.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
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
                        Note
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
        ) : null}
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
              Quick notes between you and Colin on this project.
            </CardDescription>
          </div>
        </CardHeader>
        <MessageThread
          messages={threadMessages}
          action={messageAction}
          emptyHint="Drop Colin a note any time — questions, photos, anything."
        />
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
              {files.length} file{files.length === 1 ? "" : "s"} shared with you.
            </CardDescription>
          </div>
        </CardHeader>
        {files.length === 0 ? (
          <p className="text-sm text-charcoal-400">No documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((d, i) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-900/40 px-3 py-2 text-sm"
              >
                <span className="truncate text-charcoal-100">{d.name}</span>
                {fileUrls[i] ? (
                  <a
                    href={fileUrls[i] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] uppercase tracking-[0.18em] text-gold-400 hover:text-gold-300"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-charcoal-500">
                    {formatDate(d.created_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="rw-eyebrow">{label}</dt>
      <dd className="mt-1 text-charcoal-100">{value}</dd>
    </div>
  );
}
