/**
 * Standard envelope every Phase 1 server action returns. Pairs with
 * useActionState() on the client + the FormShell pattern in
 * components/admin: the client effect watches `ok` to fire a toast and,
 * if `redirectTo` is set, navigates there.
 *
 * `fieldErrors` lets a single action surface per-field validation
 * messages without a separate validation lib.
 */
export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return { ok: false, error, fieldErrors };
}

export function ok(
  message: string,
  redirectTo?: string,
): ActionState {
  return { ok: true, message, redirectTo };
}
