import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-xs font-medium uppercase tracking-[0.18em] text-charcoal-300 mb-1.5",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
