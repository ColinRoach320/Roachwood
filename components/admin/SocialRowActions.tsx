"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Trash2, Send, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  setSocialPostStatus,
  deleteSocialPost,
} from "@/app/admin/content/social/actions";
import type { SocialPostStatus } from "@/lib/types";

interface Props {
  id: string;
  status: SocialPostStatus;
  storagePath: string | null;
}

export function SocialRowActions({ id, status, storagePath }: Props) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function flip(next: SocialPostStatus) {
    setBusy(true);
    try {
      await setSocialPostStatus(id, next);
      toast.success(next === "posted" ? "Marked posted." : "Back to draft.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post draft? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteSocialPost(id, storagePath);
      toast.success("Deleted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/content/social/${id}/edit`}
        aria-label="Edit"
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-charcoal-100"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      {status === "draft" ? (
        <button
          type="button"
          onClick={() => flip("posted")}
          disabled={busy}
          aria-label="Mark posted"
          className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-emerald-300 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => flip("draft")}
          disabled={busy}
          aria-label="Back to draft"
          className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-gold-300 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
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
