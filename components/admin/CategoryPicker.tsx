"use client";

import * as React from "react";
import { Boxes, HardHat, Users, Wrench, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

interface Props {
  defaultValue?: ExpenseCategory | "";
  name?: string;
}

const OPTIONS: { value: ExpenseCategory; label: string; icon: React.ElementType }[] = [
  { value: "materials", label: "Materials", icon: Boxes },
  { value: "labor", label: "Labor", icon: HardHat },
  { value: "subcontractor", label: "Subcontractor", icon: Users },
  { value: "equipment", label: "Equipment", icon: Wrench },
  { value: "other", label: "Other", icon: Package },
];

/**
 * Big-button category picker for the expense form. Renders five
 * 60px+ tap targets that toggle a hidden <input> so the form posts the
 * selected value through the existing server action without changes.
 */
export function CategoryPicker({ defaultValue = "", name = "category" }: Props) {
  const [value, setValue] = React.useState<string>(defaultValue ?? "");

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue(active ? "" : o.value)}
              aria-pressed={active}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs font-medium uppercase tracking-[0.16em] transition",
                active
                  ? "border-gold-500 bg-gold-500/10 text-gold-300 shadow-gold-glow"
                  : "border-charcoal-700 bg-charcoal-800 text-charcoal-200 hover:border-charcoal-600 hover:bg-charcoal-700",
              )}
            >
              <o.icon
                className={cn(
                  "h-6 w-6",
                  active ? "text-gold-400" : "text-charcoal-400",
                )}
                strokeWidth={1.6}
              />
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
