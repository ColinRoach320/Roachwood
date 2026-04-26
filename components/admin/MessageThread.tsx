"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormShell } from "@/components/admin/FormShell";
import { initialActionState, type ActionState } from "@/lib/actions";
import { formatDate } from "@/lib/utils";

export interface ThreadMessage {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender_name: string | null;
  is_me: boolean;
}

interface Props {
  messages: ThreadMessage[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Empty-state copy shown when the thread has no messages yet. */
  emptyHint?: string;
}

export function MessageThread({ messages, action, emptyHint }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-charcoal-400">
            {emptyHint ?? "No messages yet."}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.is_me
                  ? "ml-auto max-w-[80%] rounded-lg rounded-br-sm border border-gold-500/30 bg-gold-500/10 px-4 py-2.5"
                  : "mr-auto max-w-[80%] rounded-lg rounded-bl-sm border border-charcoal-700 bg-charcoal-800 px-4 py-2.5"
              }
            >
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em]">
                <span className={m.is_me ? "text-gold-300" : "text-charcoal-300"}>
                  {m.is_me ? "You" : (m.sender_name ?? "Sender")}
                </span>
                <span className="text-charcoal-500">
                  {formatDate(m.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal-50">
                {m.body}
              </p>
            </div>
          ))
        )}
      </div>

      <FormShell state={state}>
        <form ref={formRef} action={formAction} className="flex flex-col gap-2">
          <Textarea
            name="body"
            rows={3}
            placeholder="Type a message…"
            required
          />
          <Button type="submit" size="sm" className="self-end">
            <Send className="h-4 w-4" /> Send
          </Button>
        </form>
      </FormShell>
    </div>
  );
}
