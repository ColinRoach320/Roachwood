"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { sendPortalInvite } from "@/app/admin/clients/actions";

interface Props {
  clientId: string;
  hasEmail: boolean;
  invitedAt: string | null;
}

/**
 * Send / Resend portal invite. Wires to sendPortalInvite which:
 *   1. generates a 24h magic link via supabase.auth.admin
 *   2. emails it through Resend with the branded invite copy
 *   3. stamps clients.portal_invited_at
 *
 * Three states:
 *   - no email on file → disabled with tooltip
 *   - never invited    → "Send portal invite"
 *   - already invited  → "Resend portal invite · sent <date>"
 */
export function PortalInviteButton({ clientId, hasEmail, invitedAt }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await sendPortalInvite(clientId);
      if (!res.ok) {
        toast.error(res.error ?? "Could not send invite.");
        return;
      }
      toast.success(res.message ?? "Portal invite sent.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasEmail) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="Add client email first"
      >
        <Send className="h-4 w-4" /> Send portal invite
      </Button>
    );
  }

  const label = invitedAt ? "Resend portal invite" : "Send portal invite";
  const Icon = invitedAt ? RefreshCw : Send;
  const sentDate = invitedAt
    ? new Date(invitedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Phoenix",
      })
    : null;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={invitedAt ? "outline" : "primary"}
        size="sm"
        onClick={send}
        disabled={busy}
      >
        <Icon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {label}
      </Button>
      {sentDate ? (
        <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-500">
          Last sent {sentDate}
        </p>
      ) : null}
    </div>
  );
}
