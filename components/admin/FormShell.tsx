"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { ActionState } from "@/lib/actions";

interface Props {
  state: ActionState;
  pending?: boolean;
  /** Toast text on success. Falls back to state.message. */
  successMessage?: string;
  children: React.ReactNode;
}

/**
 * Wrap the children of any admin form with this. Watches the action
 * state and:
 *   - fires a success toast + navigates to state.redirectTo on ok
 *   - fires an error toast on failure
 *   - exposes the inline fieldErrors via context so individual
 *     <FieldError name="..."/> components stay decoupled.
 *
 * Children render the raw <form> + inputs. Use action={formAction} on
 * the form element, supplied by the page that owns useActionState.
 */
export function FormShell({ state, successMessage, children }: Props) {
  const router = useRouter();
  const toast = useToast();
  const lastFingerprint = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Re-render of useActionState always returns a fresh object even when
    // nothing changed; gate the side effects to a single fire per result.
    const fp = `${state.ok}|${state.error ?? ""}|${state.message ?? ""}|${state.redirectTo ?? ""}`;
    if (fp === lastFingerprint.current) return;
    lastFingerprint.current = fp;

    if (state.ok) {
      toast.success(successMessage ?? state.message ?? "Saved.");
      if (state.redirectTo) router.push(state.redirectTo);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, successMessage, router, toast]);

  return (
    <FieldErrorContext.Provider value={state.fieldErrors ?? {}}>
      {children}
    </FieldErrorContext.Provider>
  );
}

const FieldErrorContext = React.createContext<Record<string, string>>({});

export function FieldError({ name }: { name: string }) {
  const errors = React.useContext(FieldErrorContext);
  const msg = errors[name];
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-300">{msg}</p>;
}
