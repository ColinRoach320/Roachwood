"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  defaultValue?: number | string | null;
};

/**
 * Number input that formats with thousands separators as the user
 * types ("1500" → "1,500"). Submitted as plain text — `parseNumber()`
 * in `lib/utils.ts` already strips commas before reaching the database,
 * so server actions don't need any changes.
 */
export function MoneyInput({ defaultValue, ...rest }: Props) {
  const [display, setDisplay] = React.useState<string>(() =>
    formatPretty(defaultValue),
  );

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={(e) => setDisplay(formatLive(e.target.value))}
    />
  );
}

/**
 * Live formatter — keeps the user's caret-friendly state. Does NOT
 * coerce trailing dots away ("12." stays as the user types) and only
 * applies the thousands separator to the integer portion.
 */
function formatLive(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");

  // Drop any second-or-later dots so "1.2.3" can't happen.
  const firstDot = cleaned.indexOf(".");
  const limited =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");

  if (limited === "") return "";

  const [intRaw, decRaw] = limited.split(".");
  const intPart = intRaw === "" ? "" : Number(intRaw).toLocaleString("en-US");
  if (decRaw === undefined) return intPart;
  return `${intPart}.${decRaw.slice(0, 2)}`;
}

/** One-shot pretty format used to seed the field from a saved value. */
function formatPretty(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n)) return "";
  // Only show .XX when there's actually a fractional part, otherwise
  // dollar amounts read as "1,500" rather than "1,500.00".
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
