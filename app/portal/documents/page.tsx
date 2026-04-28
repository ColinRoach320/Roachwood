import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Download, FileText } from "lucide-react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { DocumentRow, Job } from "@/lib/types";

export default async function PortalDocumentsPage() {
  const supabase = await createClient();

  // RLS: documents client policy filters to client-visible docs on
  // jobs the current user owns. Excluding "photo" kind here — those
  // belong to the progress-photo gallery on the job page.
  const [docsRes, jobsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .neq("kind", "photo")
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, title"),
  ]);

  const docs = (docsRes.data ?? []) as DocumentRow[];
  const jobs = (jobsRes.data ?? []) as Pick<Job, "id" | "title">[];

  // Pre-sign every doc with the service-role storage client so the
  // links are ready when the page renders.
  const adminStorage = createAdminClient();
  const signedUrls = await Promise.all(
    docs.map(async (d) => {
      const { data } = await adminStorage.storage
        .from("documents")
        .createSignedUrl(d.storage_path, 60 * 30);
      return data?.signedUrl ?? null;
    }),
  );

  // Group by job for a tidy "by project" layout.
  const byJob = new Map<string, { id: string | null; title: string; rows: { doc: DocumentRow; url: string | null }[] }>();
  docs.forEach((d, i) => {
    const jobId = d.job_id ?? "__loose__";
    if (!byJob.has(jobId)) {
      const jobTitle =
        jobs.find((j) => j.id === d.job_id)?.title ??
        (d.job_id ? "(project)" : "Unattached");
      byJob.set(jobId, { id: d.job_id, title: jobTitle, rows: [] });
    }
    byJob.get(jobId)!.rows.push({ doc: d, url: signedUrls[i] });
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Documents</p>
        <h1 className="rw-display mt-2 text-3xl">Project files</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Contracts, plans, and other paperwork attached to your projects.
        </p>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>No documents yet.</CardTitle>
              <CardDescription>
                Files your contractor uploads will appear here.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(byJob.values()).map((group) => (
            <Card key={group.id ?? group.title} className="p-0 overflow-hidden">
              <CardHeader className="px-6 pt-6">
                <div>
                  <CardTitle>{group.title}</CardTitle>
                  <CardDescription>
                    {group.rows.length} file
                    {group.rows.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
              </CardHeader>
              <ul className="divide-y divide-charcoal-700 border-t border-charcoal-700">
                {group.rows.map(({ doc, url }) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 px-6 py-4"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-charcoal-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-charcoal-100">
                        {doc.name}
                      </p>
                      <p className="text-xs text-charcoal-500">
                        Uploaded {formatDate(doc.created_at)}
                      </p>
                    </div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-gold-500/60 px-3 text-xs font-medium text-gold-400 hover:bg-gold-500/10 hover:border-gold-500 transition"
                      >
                        <Download className="h-4 w-4" /> Download
                      </a>
                    ) : (
                      <span className="text-xs text-charcoal-500">
                        unavailable
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
