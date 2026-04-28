"use client";

import * as React from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getInvoicePaymentLink } from "@/app/portal/payments/actions";

interface Props {
  invoiceId: string;
  amountLabel: string;
}

/**
 * "Pay now" button for an outstanding invoice. Calls the server
 * action which returns either the existing or a freshly-minted Stripe
 * Payment Link, then redirects to it. Stripe collects the card on
 * their hosted page — we don't touch card data in our domain.
 */
export function PayNowButton({ invoiceId, amountLabel }: Props) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await getInvoicePaymentLink(invoiceId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={pay}
      disabled={busy}
      size="lg"
      className="w-full justify-center sm:w-auto"
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Opening…
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" /> Pay now · {amountLabel}
        </>
      )}
    </Button>
  );
}
