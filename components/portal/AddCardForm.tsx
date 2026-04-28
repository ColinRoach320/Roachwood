"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createSetupIntent } from "@/app/portal/payments/actions";

interface Props {
  publishableKey: string;
}

// Lazily-resolved Stripe instance shared across mounts. loadStripe
// is idempotent but caching the promise avoids re-downloading the JS
// when the user opens/closes the form.
let stripePromise: Promise<StripeJs | null> | null = null;
function getStripe(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

export function AddCardForm({ publishableKey }: Props) {
  const [open, setOpen] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = React.useState(false);
  const toast = useToast();

  async function openForm() {
    setOpen(true);
    if (clientSecret) return;
    setLoadingIntent(true);
    try {
      const res = await createSetupIntent();
      if (!res.ok) {
        toast.error(res.error);
        setOpen(false);
        return;
      }
      setClientSecret(res.clientSecret);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start payment setup.",
      );
      setOpen(false);
    } finally {
      setLoadingIntent(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={openForm}
        className="w-full justify-center sm:w-auto"
      >
        <Plus className="h-4 w-4" /> Add card
      </Button>
    );
  }

  return (
    <div className="rw-card w-full p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-charcoal-50">
          Add a card
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-charcoal-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loadingIntent || !clientSecret ? (
        <div className="flex items-center gap-2 text-sm text-charcoal-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Securing connection…
        </div>
      ) : (
        <Elements
          stripe={getStripe(publishableKey)}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
              variables: {
                colorPrimary: "#cda85c",
                colorBackground: "#1f1d1a",
                colorText: "#f3efe6",
                colorDanger: "#fb7185",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                borderRadius: "6px",
              },
            },
          }}
        >
          <SetupForm onClose={() => setOpen(false)} />
        </Elements>
      )}
    </div>
  );
}

function SetupForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        // No redirect needed — we stay on /portal/payments and refresh.
        return_url: `${window.location.origin}/portal/payments`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message ?? "Could not save card.");
      setSubmitting(false);
      return;
    }

    toast.success("Card saved.");
    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <div className="flex flex-col-reverse gap-3 border-t border-charcoal-700 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="w-full justify-center sm:w-auto"
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          className="w-full justify-center sm:w-auto"
          disabled={!stripe || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save card"
          )}
        </Button>
      </div>
    </form>
  );
}
