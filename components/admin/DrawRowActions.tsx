"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Link2, ExternalLink, Check, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  generateDrawPaymentLink,
  markDrawSent,
} from "@/app/admin/invoices/actions";

interface Props {
  drawId: string;
  status: "pending" | "sent" | "paid";
  existingLink: string | null;
}

/**
 * Per-draw admin controls — Mark sent + Generate payment link + copy.
 * The link is idempotent (the action returns the existing URL if one
 * already exists), so this button is safe to retry.
 */
export function DrawRowActions({ drawId, status, existingLink }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [link, setLink] = React.useState<string | null>(existingLink);
  const [busy, setBusy] = React.useState<"none" | "send" | "link" | "copy">(
    "none",
  );

  async function send() {
    setBusy("send");
    try {
      const res = await markDrawSent(drawId);
      if (!res.ok) {
        toast.error(res.error ?? "Could not mark sent.");
        return;
      }
      toast.success(res.message ?? "Draw marked sent.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mark sent failed.");
    } finally {
      setBusy("none");
    }
  }

  async function generate() {
    setBusy("link");
    try {
      const res = await generateDrawPaymentLink(drawId);
      if (!res.ok || !res.url) {
        toast.error(res.error ?? "Could not generate link.");
        return;
      }
      setLink(res.url);
      toast.success("Payment link ready.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not generate link.",
      );
    } finally {
      setBusy("none");
    }
  }

  async function copy() {
    if (!link) return;
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    } finally {
      window.setTimeout(() => setBusy("none"), 600);
    }
  }

  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
        <Check className="h-3.5 w-3.5" /> Paid
      </span>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
      {status === "pending" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={send}
          disabled={busy !== "none"}
        >
          {busy === "send" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Mark sent
        </Button>
      ) : null}

      {!link ? (
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={busy !== "none"}
        >
          {busy === "link" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Payment link
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copy}
            disabled={busy !== "none"}
          >
            {busy === "copy" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy
          </Button>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold-500/60 px-3 text-xs font-medium text-gold-400 hover:bg-gold-500/10 hover:border-gold-500 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </a>
        </>
      )}
    </div>
  );
}
