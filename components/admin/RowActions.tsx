"use client";

import * as React from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface Props {
  editHref: string;
  visible: boolean;
  onToggleVisible: () => Promise<void>;
  onDelete: () => Promise<void>;
  deleteLabel?: string;
  deleteConfirm?: string;
}

/**
 * Pencil / eye / trash icon trio used across the content lists. Each
 * action is a server action passed in from the page so the heavy lifting
 * stays server-side; this component just runs the optimistic UI bits.
 */
export function RowActions({
  editHref,
  visible,
  onToggleVisible,
  onDelete,
  deleteLabel = "Delete this row?",
  deleteConfirm = "This cannot be undone.",
}: Props) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await onToggleVisible();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`${deleteLabel}\n\n${deleteConfirm}`)) return;
    setBusy(true);
    try {
      await onDelete();
      toast.success("Deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={editHref}
        aria-label="Edit"
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-charcoal-100"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={visible ? "Hide from public site" : "Show on public site"}
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-gold-300 disabled:opacity-40"
      >
        {visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label="Delete"
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-400 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
