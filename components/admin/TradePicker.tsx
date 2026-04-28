"use client";

import * as React from "react";
import {
  Zap,
  Droplets,
  Wind,
  Hammer,
  PaintBucket,
  Layers,
  Home,
  Mountain,
  Sprout,
  SprayCan,
  Square,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubcontractorTrade } from "@/lib/types";

interface Props {
  defaultValue?: SubcontractorTrade | "";
  name?: string;
}

const OPTIONS: {
  value: SubcontractorTrade;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "plumbing", label: "Plumbing", icon: Droplets },
  { value: "hvac", label: "HVAC", icon: Wind },
  { value: "framing", label: "Framing", icon: Hammer },
  { value: "drywall", label: "Drywall", icon: Square },
  { value: "painting", label: "Painting", icon: PaintBucket },
  { value: "flooring", label: "Flooring", icon: Layers },
  { value: "roofing", label: "Roofing", icon: Home },
  { value: "concrete", label: "Concrete", icon: Mountain },
  { value: "landscaping", label: "Landscape", icon: Sprout },
  { value: "cleaning", label: "Cleaning", icon: SprayCan },
  { value: "other", label: "Other", icon: HardHat },
];

/**
 * Big-button trade picker for the subcontractor form. Same shape as
 * CategoryPicker — twelve large tap targets toggling a hidden input
 * so the form posts the selected value through the normal action.
 */
export function TradePicker({ defaultValue = "", name = "trade" }: Props) {
  const [value, setValue] = React.useState<string>(defaultValue ?? "");

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
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

export const TRADE_LABELS: Record<SubcontractorTrade, string> = OPTIONS.reduce(
  (acc, o) => {
    acc[o.value] = o.label;
    return acc;
  },
  {} as Record<SubcontractorTrade, string>,
);
