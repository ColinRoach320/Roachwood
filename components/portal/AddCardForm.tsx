"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
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
        <h3 className="font-display text-lg text-charcoal-50">Add a card</h3>
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
        // We pass `stripe` only (no clientSecret) to Elements so we can
        // use the simpler legacy CardElement instead of PaymentElement.
        // confirmCardSetup handles the clientSecret directly.
        <Elements stripe={getStripe(publishableKey)}>
          <CardSetupForm
            clientSecret={clientSecret}
            onClose={() => setOpen(false)}
          />
        </Elements>
      )}
    </div>
  );
}

function CardSetupForm({
  clientSecret,
  onClose,
}: {
  clientSecret: string;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [complete, setComplete] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) {
      toast.error("Card field hasn't loaded yet — try again in a moment.");
      return;
    }

    setSubmitting(true);
    const { error, setupIntent } = await stripe.confirmCardSetup(
      clientSecret,
      { payment_method: { card } },
    );

    if (error) {
      const msg = error.message ?? "Could not save card.";
      setFieldError(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }
    if (setupIntent?.status !== "succeeded") {
      const msg = `Card setup ${setupIntent?.status ?? "failed"}.`;
      setFieldError(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }

    toast.success("Card saved.");
    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label
          htmlFor="card-element"
          className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-charcoal-300"
        >
          Card details
        </label>
        <div
          id="card-element"
          className={`rounded-md border bg-charcoal-900 px-3 py-3 transition ${
            fieldError
              ? "border-red-500/60"
              : focused
                ? "border-gold-500/60 ring-2 ring-gold-500/30"
                : "border-charcoal-600"
          }`}
        >
          <CardElement
            options={{
              hidePostalCode: false,
              style: {
                base: {
                  fontSize: "15px",
                  color: "#f3efe6",
                  fontFamily:
                    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                  "::placeholder": { color: "#6f6e6a" },
                  iconColor: "#cda85c",
                },
                invalid: {
                  color: "#fca5a5",
                  iconColor: "#fca5a5",
                },
              },
            }}
            onChange={(ev) => {
              setComplete(ev.complete);
              setFieldError(ev.error?.message ?? null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>
        {fieldError ? (
          <p className="mt-1.5 text-xs text-red-300">{fieldError}</p>
        ) : (
          <p className="mt-1.5 text-xs text-charcoal-500">
            Card number, expiry, CVC, and ZIP — Stripe stores these, not us.
          </p>
        )}
      </div>

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
          disabled={!stripe || !complete || submitting}
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
