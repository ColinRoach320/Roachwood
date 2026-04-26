import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UploadDocumentForm } from "@/components/admin/UploadDocumentForm";
import { DocumentRowActions } from "@/components/admin/DocumentRow";
import { SearchInput } from "@/components/admin/SearchInput";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { uploadDocument } from "./actions";
import type { DocumentRow, Job } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ q?: string; job_id?: string }>;
}

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  const { q, job_id } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (job_id) query = query.eq("job_id", job_id);
  if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);
  const { data: documents } = await query;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("created_at", { ascending: false });

  const jobMap = new Map(
    (jobs ?? []).map((j: Pick<Job, "id" | "title">) => [j.id, j]),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Documents</p>
        <h1 className="rw-display mt-2 text-3xl">Documents</h1>
        <p className="mt-2 text-sm text-charcoal-400 max-w-xl">
          Plans, contracts, and reference photos. Files marked client-visible
          appear inside that client&apos;s portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              Stored privately in Supabase Storage; clients fetch via signed
              URL only when they have read access on the parent job.
            </CardDescription>
          </div>
        </CardHeader>
        <UploadDocumentForm
          action={uploadDocument}
          jobs={(jobs ?? []) as Pick<Job, "id" | "title">[]}
          defaultJobId={job_id}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-charcoal-400">
          {(documents ?? []).length} file{(documents ?? []).length === 1 ? "" : "s"}.
        </p>
        <SearchInput placeholder="Search by name…" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60 border-b border-charcoal-700">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Job</th>
              <th className="px-6 py-3 font-medium">Visibility</th>
              <th className="px-6 py-3 font-medium">Uploaded</th>
              <th className="px-6 py-3 font-medium text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {(documents ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-charcoal-400"
                >
                  {q ? "No documents match." : "No documents yet."}
                </td>
              </tr>
            ) : (
              (documents as DocumentRow[]).map((d) => {
                const job = d.job_id ? jobMap.get(d.job_id) : null;
                return (
                  <tr key={d.id} className="hover:bg-charcoal-700/30 transition">
                    <td className="px-6 py-3 text-charcoal-100">{d.name}</td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {job ? (
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="hover:text-gold-400"
                        >
                          {job.title}
                        </Link>
                      ) : (
                        <span className="text-charcoal-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {d.visible_to_client ? (
                        <Badge tone="gold">Client visible</Badge>
                      ) : (
                        <Badge tone="neutral">Internal</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-charcoal-300">
                      {formatDate(d.created_at)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <DocumentRowActions
                        id={d.id}
                        name={d.name}
                        storagePath={d.storage_path}
                        jobId={d.job_id}
                      />
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
