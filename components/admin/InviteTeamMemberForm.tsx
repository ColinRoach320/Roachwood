"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FormShell, FieldError } from "@/components/admin/FormShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialActionState, type ActionState } from "@/lib/actions";

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff (read-only)" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

export function InviteTeamMemberForm({ action }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormShell state={state}>
      <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end">
        <div>
          <Label htmlFor="invite-email">Email *</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
          />
          <FieldError name="email" />
        </div>
        <div>
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" name="full_name" placeholder="Optional" />
        </div>
        <div>
          <Label htmlFor="invite-role">Role *</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue="staff"
            className="rw-input"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton label="Send invite" pendingLabel="Sending…" />
      </form>
    </FormShell>
  );
}
