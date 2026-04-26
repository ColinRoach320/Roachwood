"use client";

import { useTransition } from "react";
import { Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ActionState } from "@/lib/actions";
import type { EstimateStatus } from "@/lib/types";

interface Props {
  id: string;
  currentStatus: EstimateStatus;
  setStatus: (id: string, status: EstimateStatus) => Promise<ActionState>;
}

export function EstimateActions({ id, currentStatus, setStatus }: Props) {
  const [pending, start] = useTransition();
  const toast = useToast();

  function transition(next: EstimateStatus, label: string) {
    start(async () => {
      const res = await setStatus(id, next);
      if (res.ok) toast.success(res.message ?? `${label} ✓`);
      else toast.error(res.error ?? `Could not ${label.toLowerCase()}.`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus === "draft" && (
        <Button
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => transition("sent", "Send")}
        >
          <Send className="h-4 w-4" /> Mark as sent
        </Button>
      )}
      {(currentStatus === "draft" || currentStatus === "sent") && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => transition("approved", "Approve")}
        >
          <Check className="h-4 w-4" /> Mark approved
        </Button>
      )}
      {(currentStatus === "draft" || currentStatus === "sent") && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => transition("declined", "Decline")}
        >
          <X className="h-4 w-4" /> Mark declined
        </Button>
      )}
    </div>
  );
}
