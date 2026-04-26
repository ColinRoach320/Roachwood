import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-wide transition focus:outline-none focus:ring-2 focus:ring-gold-500/40";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold-500 text-charcoal-950 hover:bg-gold-400 active:bg-gold-600 shadow-gold-glow",
  secondary:
    "bg-charcoal-700 text-charcoal-50 hover:bg-charcoal-600 border border-charcoal-600",
  ghost:
    "bg-transparent text-charcoal-100 hover:bg-charcoal-700/60",
  outline:
    "bg-transparent border border-gold-500/60 text-gold-400 hover:bg-gold-500/10 hover:border-gold-500",
  danger:
    "bg-red-500/90 text-white hover:bg-red-500 border border-red-400/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm uppercase tracking-[0.2em]",
};

interface Props
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  variant?: Variant;
  size?: Size;
}

/**
 * Anchor styled identically to <Button> — for cancel/back/external
 * links inside form footers and toolbars.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Props) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
}
