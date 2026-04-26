import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 group", className)}
    >
      <span
        aria-hidden
        className="block h-2.5 w-2.5 rotate-45 bg-gold-500 group-hover:bg-gold-400 transition"
      />
      <span
        className={cn(
          "font-display tracking-[0.04em] text-charcoal-50 group-hover:text-white transition",
          text,
        )}
      >
        Roach<span className="italic text-gold-500">wood</span>
      </span>
    </Link>
  );
}
