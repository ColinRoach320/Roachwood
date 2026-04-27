"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Link2, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Props {
  invoiceId: string;
  existingLink: string | null;
}

/**
 * Generate (or display + copy) the Stripe Payment Link for an invoice.
 * The route handler is idempotent — if a link already exists for the
 * invoice it returns the same URL, so this button is safe to retry.
 */
export function PaymentLinkButton({ invoiceId, existingLink }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [link, setLink] = React.useState<string | null>(existingLink);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setLink(data.url);
      toast.success(
        data ? "Payment link ready." : "Payment link returned.",
      );
      // Refresh so the server-rendered "Pay now" links elsewhere on the
      // page (and the client portal) pick up the new URL.
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not generate link.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy manually.");
    }
  }

  if (!link) {
    return (
      <Button type="button" onClick={generate} disabled={busy} size="sm">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" /> Generate Payment Link
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-charcoal-700 bg-charcoal-900/40 p-3 sm:flex-row sm:items-center">
      <code className="flex-1 truncate rounded bg-charcoal-900 px-2 py-1.5 font-mono text-xs text-charcoal-200">
        {link}
      </code>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          onClick={copyLink}
          size="sm"
          variant="secondary"
          aria-label="Copy payment link"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy
            </>
          )}
        </Button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold-500/60 px-3 text-xs font-medium text-gold-400 hover:bg-gold-500/10 hover:border-gold-500 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      </div>
    </div>
  );
}
