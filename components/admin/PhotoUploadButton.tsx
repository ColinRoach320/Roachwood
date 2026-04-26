"use client";

import { useActionState, useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { initialActionState, type ActionState } from "@/lib/actions";

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

/**
 * Big mobile-friendly camera button. On phones the file input pulls up
 * the camera (via capture="environment"); on desktop it opens the file
 * picker. The form submits as soon as a file is chosen — no extra tap.
 */
export function PhotoUploadButton({ action }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Photo uploaded.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast]);

  return (
    <form ref={formRef} action={formAction}>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-md bg-gold-500 px-6 text-sm font-semibold uppercase tracking-[0.18em] text-charcoal-950 hover:bg-gold-400 transition shadow-gold-glow sm:w-auto"
      >
        <Camera className="h-5 w-5" /> Take / upload photo
      </button>
    </form>
  );
}
