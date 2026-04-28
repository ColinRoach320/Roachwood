"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { removePaymentMethod } from "@/app/portal/payments/actions";

interface Props {
  paymentMethodId: string;
  label: string;
}

export function RemoveCardButton({ paymentMethodId, label }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function remove() {
    if (!window.confirm(`Remove ${label}? This deletes the saved card.`)) return;
    setBusy(true);
    try {
      const res = await removePaymentMethod(paymentMethodId);
      if (!res.ok) {
        toast.error(res.error ?? "Remove failed.");
        return;
      }
      toast.success(res.message ?? "Card removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Remove ${label}`}
      className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-400 disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
