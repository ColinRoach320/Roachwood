"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  param?: string;
  options: Option[];
  /** Label for the "all" pill. */
  allLabel?: string;
}

/**
 * Pill-row status filter that mirrors its selection into the URL so the
 * parent server component can filter results. Includes an All pill that
 * clears the param.
 */
export function StatusFilter({
  param = "status",
  options,
  allLabel = "All",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(param);

  function setValue(value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill active={!current} onClick={() => setValue(null)}>
        {allLabel}
      </Pill>
      {options.map((o) => (
        <Pill
          key={o.value}
          active={current === o.value}
          onClick={() => setValue(o.value)}
        >
          {o.label}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] transition",
        active
          ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
          : "border-charcoal-600 text-charcoal-300 hover:border-charcoal-500 hover:text-charcoal-100",
      )}
    >
      {children}
    </button>
  );
}
