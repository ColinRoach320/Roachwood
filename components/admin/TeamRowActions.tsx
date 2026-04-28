"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import {
  updateTeamMemberRole,
  removeTeamMember,
} from "@/app/admin/team/actions";

interface Props {
  userId: string;
  currentRole: string;
  displayName: string;
  isSelf: boolean;
}

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super admin" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
];

export function TeamRowActions({
  userId,
  currentRole,
  displayName,
  isSelf,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    if (newRole === currentRole) return;
    setBusy(true);
    try {
      const res = await updateTeamMemberRole(userId, newRole);
      if (!res.ok) {
        toast.error(res.error ?? "Update failed.");
        e.target.value = currentRole;
        return;
      }
      toast.success(res.message ?? "Role updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
      e.target.value = currentRole;
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (
      !window.confirm(
        `Remove ${displayName} from the team?\n\nThis deletes their account and they will lose access immediately.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await removeTeamMember(userId);
      if (!res.ok) {
        toast.error(res.error ?? "Remove failed.");
        return;
      }
      toast.success(res.message ?? "Member removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        value={currentRole}
        onChange={handleRoleChange}
        disabled={busy || isSelf}
        title={isSelf ? "You can't change your own role" : "Change role"}
        className="rw-input h-8 px-2 text-xs"
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleRemove}
        disabled={busy || isSelf}
        aria-label={`Remove ${displayName}`}
        title={isSelf ? "You can't remove yourself" : "Remove member"}
        className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-charcoal-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
