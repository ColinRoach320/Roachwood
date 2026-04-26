"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";

interface Props extends Omit<ButtonProps, "children"> {
  label: string;
  pendingLabel?: string;
}

/**
 * Submits the enclosing <form>. Uses useFormStatus so the button knows
 * when the action is in flight without the page passing a pending bool.
 */
export function SubmitButton({
  label,
  pendingLabel,
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...rest}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel ?? "Saving…"}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
