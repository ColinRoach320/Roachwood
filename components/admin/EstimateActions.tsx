"use client";

import { useTransition } from "react";
import { Send, Trophy, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ActionState } from "@/lib/actions";
import type { EstimateStatus } from "@/lib/types";

interface Props {
  id: string;
  currentStatus: EstimateStatus;
  setStatus: (id: string, status: EstimateStatus) => Promise<ActionState>;
}

/**
 * Toolbar of estimate status transitions. Currently unused — the
 * estimate detail page renders inline forms against `setEstimateStatus`
 * directly — but kept here as a richer "with toast feedback" variant
 * we can drop in if/when the detail page wants client-side optimism.
 */
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
          <Send className="h-4 w-4" /> Mark sent
        </Button>
      )}
      {(currentStatus === "draft" || currentStatus === "sent") && (
        <>
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() => transition("won", "Won")}
          >
            <Trophy className="h-4 w-4" /> Won
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => transition("lost", "Lost")}
          >
            <X className="h-4 w-4" /> Lost
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => transition("no_response", "No response")}
          >
            <Clock className="h-4 w-4" /> No response
          </Button>
        </>
      )}
    </div>
  );
}
