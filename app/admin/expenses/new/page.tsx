import { Card } from "@/components/ui/Card";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { createClient } from "@/lib/supabase/server";
import { createExpenseRecord } from "../actions";
import type { Job, Client } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ job_id?: string }>;
}

export default async function NewExpensePage({ searchParams }: PageProps) {
  const { job_id } = await searchParams;
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .order("created_at", { ascending: false });

  const clientIds = Array.from(
    new Set((jobs ?? []).map((j: Pick<Job, "client_id">) => j.client_id)),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, contact_name")
        .in("id", clientIds)
    : { data: [] };
  const clientMap = new Map(
    (clients ?? []).map((c: Pick<Client, "id" | "contact_name">) => [
      c.id,
      c.contact_name,
    ]),
  );
  const jobOptions = (jobs ?? []).map(
    (j: Pick<Job, "id" | "title" | "client_id">) => ({
      id: j.id,
      title: j.title,
      client_name: clientMap.get(j.client_id) ?? null,
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Expenses / New</p>
        <h1 className="rw-display mt-2 text-3xl">Log expense</h1>
      </div>

      <Card>
        <ExpenseForm
          jobs={jobOptions}
          defaultJobId={job_id}
          action={createExpenseRecord}
          cancelHref="/admin/expenses"
          submitLabel="Log expense"
        />
      </Card>
    </div>
  );
}
