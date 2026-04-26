"use client";

import { Send } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

interface Props {
  hasEmail: boolean;
}

/**
 * Placeholder for the Resend-powered portal invite. No email goes out yet
 * — it just confirms the action UI is in place. Wire to a real email
 * action once the Resend domain is verified.
 */
export function PortalInviteButton({ hasEmail }: Props) {
  const toast = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        toast.info(
          hasEmail
            ? "Portal invite emails ship in the next phase. Add the client's auth account in Supabase for now."
            : "Add an email address to this client first.",
        )
      }
      disabled={!hasEmail}
    >
      <Send className="h-4 w-4" /> Send portal invite
    </Button>
  );
}
