"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { deleteClientRecord } from "@/app/admin/clients/actions";

interface Props {
  id: string;
  name: string;
  /** Icon-only compact button for table rows; full button for detail page. */
  variant?: "icon" | "full";
}

const CONFIRM_BODY =
  "This permanently removes the client AND every job, estimate, invoice, expense, document, message, and update tied to them. This cannot be undone.";

export function DeleteClientButton({ id, name, variant = "icon" }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function remove() {
    if (!window.confirm(`Delete “${name}”?\n\n${CONFIRM_BODY}`)) return;
    setBusy(true);
    try {
      const res = await deleteClientRecord(id);
      if (!res.ok) {
        toast.error(res.error ?? "Delete failed.");
        return;
      }
      toast.success(res.message ?? "Client deleted.");
      router.push(res.redirectTo ?? "/admin/clients");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Delete ${name}`}
        title="Delete client"
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-400 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={remove}
      disabled={busy}
    >
      <Trash2 className="h-4 w-4" /> {busy ? "Deleting…" : "Delete client"}
    </Button>
  );
}
