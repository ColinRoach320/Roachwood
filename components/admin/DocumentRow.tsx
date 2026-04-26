"use client";

import * as React from "react";
import { Download, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  deleteDocument,
  getDocumentSignedUrl,
} from "@/app/admin/documents/actions";

interface Props {
  id: string;
  name: string;
  storagePath: string;
  jobId: string | null;
}

/**
 * One row in the documents table. Download fetches a short-lived signed
 * URL from the server and opens it in a new tab. Delete confirms with
 * window.confirm() since this is admin-only and rarely-triggered.
 */
export function DocumentRowActions({ id, name, storagePath, jobId }: Props) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function download() {
    setBusy(true);
    const { url, error } = await getDocumentSignedUrl(storagePath);
    setBusy(false);
    if (!url) {
      toast.error(error ?? "Could not generate download URL.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function remove() {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    setBusy(true);
    const res = await deleteDocument(id, storagePath, jobId);
    setBusy(false);
    if (res.ok) toast.success("Deleted.");
    else toast.error(res.error ?? "Delete failed.");
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        aria-label={`Download ${name}`}
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-gold-300 disabled:opacity-40"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Delete ${name}`}
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-400 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
